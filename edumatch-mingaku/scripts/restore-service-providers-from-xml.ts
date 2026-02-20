/**
 * WordPress エクスポート XML から商品（product）の提供者名を読み取り、
 * 事業者ごとに Profile（投稿者）を作成し、Service.provider_id をその Profile に紐づける。
 * あわせて Service.wp_product_id を設定する。
 *
 * 使い方:
 *   npx tsx scripts/restore-service-providers-from-xml.ts [WordPress.xmlのパス]
 * 例:
 *   npx tsx scripts/restore-service-providers-from-xml.ts ~/Downloads/WordPress.2026-02-19\ \(1\).xml
 *
 * マッチ方法:
 *   1. 既に wp_product_id が設定されている Service は wp:post_id でマッチ
 *   2. それ以外はタイトルでマッチ（前後空白除去）
 */
import { PrismaClient, Role } from "@prisma/client";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

const prisma = new PrismaClient();

const VENDOR_EMAIL_SUFFIX = "@edu-match.local";

/** 事業者名から投稿者（Profile）を取得または作成し、Profile.id を返す */
async function getOrCreateVendorProfile(sellerName: string): Promise<string> {
  const existing = await prisma.profile.findFirst({
    where: {
      name: sellerName,
      email: { endsWith: VENDOR_EMAIL_SUFFIX },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const id = randomUUID();
  const email = `vendor-${id}${VENDOR_EMAIL_SUFFIX}`;
  await prisma.profile.create({
    data: {
      id,
      name: sellerName,
      email,
      role: Role.PROVIDER,
      subscription_status: "INACTIVE",
    },
  });
  console.log("  Created provider:", sellerName);
  return id;
}

const DEFAULT_XML_PATH = path.join(process.cwd(), "data", "WordPress-products.xml");

function getText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object" && v !== null && "#text" in v) return getText((v as { "#text": unknown })["#text"]);
  if (typeof v === "object" && v !== null && "_" in v) return getText((v as { _: unknown })._);
  return String(v).trim();
}

function getSellerNameFromItem(item: Record<string, unknown>): string | null {
  // 1) wp:postmeta の seller_name
  const postmeta = item["wp:postmeta"];
  if (postmeta) {
    const list = Array.isArray(postmeta) ? postmeta : [postmeta];
    for (const m of list) {
      const meta = m as Record<string, unknown>;
      const key = getText(meta["wp:meta_key"]);
      if (key === "seller_name") {
        const val = getText(meta["wp:meta_value"]);
        if (val) return val;
        break;
      }
    }
  }
  // 2) category domain="service_vender"
  const cats = item.category;
  if (cats) {
    const arr = Array.isArray(cats) ? cats : [cats];
    for (const c of arr) {
      const raw = c as Record<string, unknown>;
      const domain = getText(raw["@_domain"] ?? raw.domain);
      if (domain === "service_vender") {
        const label = getText(raw["#text"] ?? raw._ ?? c);
        if (label) return label;
        break;
      }
    }
  }
  return null;
}

async function main() {
  const xmlPath = process.argv[2] || process.env.PRODUCTS_XML_PATH || DEFAULT_XML_PATH;
  if (!fs.existsSync(xmlPath)) {
    console.error("XML not found:", xmlPath);
    console.error("Usage: npx tsx scripts/restore-service-providers-from-xml.ts <path/to/WordPress.xml>");
    process.exit(1);
  }

  const xmlContent = fs.readFileSync(xmlPath, "utf-8");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const jsonObj = parser.parse(xmlContent);
  const items = jsonObj.rss?.channel?.item;
  if (!items) {
    console.warn("No items in XML.");
    process.exit(0);
  }

  const itemList = Array.isArray(items) ? items : [items];
  let updated = 0;
  let notFound = 0;
  let noSeller = 0;

  // 既存の Service を wp_product_id あり / タイトル でマップ
  const servicesByWpId = new Map<number, { id: string; title: string }>();
  const servicesByTitle = new Map<string, { id: string; title: string }>();
  const allServices = await prisma.service.findMany({
    select: { id: true, title: true, wp_product_id: true },
  });
  for (const s of allServices) {
    const t = s.title.trim();
    if (s.wp_product_id != null) {
      servicesByWpId.set(s.wp_product_id, { id: s.id, title: s.title });
    }
    if (t) servicesByTitle.set(t, { id: s.id, title: s.title });
  }

  for (const item of itemList) {
    const postType = getText(item["wp:post_type"]);
    if (postType !== "product") continue;

    const title = getText(item.title);
    if (!title) continue;

    const wpPostIdRaw = item["wp:post_id"];
    const wpProductId =
      wpPostIdRaw != null ? parseInt(String(wpPostIdRaw), 10) : null;
    const validWpId =
      wpProductId != null && !Number.isNaN(wpProductId) ? wpProductId : null;

    const sellerName = getSellerNameFromItem(item as Record<string, unknown>);
    if (!sellerName) {
      noSeller++;
      if (noSeller <= 3) console.warn("No seller for product:", title.slice(0, 50));
      continue;
    }

    let serviceId: string | null = null;
    if (validWpId != null && servicesByWpId.has(validWpId)) {
      serviceId = servicesByWpId.get(validWpId)!.id;
    }
    if (!serviceId && servicesByTitle.has(title)) {
      serviceId = servicesByTitle.get(title)!.id;
    }

    if (!serviceId) {
      notFound++;
      if (notFound <= 5) console.warn("Service not found for product:", title.slice(0, 50));
      continue;
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { wp_product_id: true },
    });
    if (!service) continue;

    const providerId = await getOrCreateVendorProfile(sellerName);
    const data: { provider_id: string; provider_display_name?: null; wp_product_id?: number } = {
      provider_id: providerId,
      provider_display_name: null, // 投稿者（Profile）の name を表示に使う
    };
    if (validWpId != null && service.wp_product_id == null) {
      data.wp_product_id = validWpId;
    }

    await prisma.service.update({
      where: { id: serviceId },
      data,
    });
    updated++;
    if (updated <= 15) console.log("Updated:", title.slice(0, 45), "->", sellerName, "(provider_id:", providerId.slice(0, 8) + "...)");
  }

  console.log("\nDone. Updated:", updated, "| Not found:", notFound, "| No seller in XML:", noSeller);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
