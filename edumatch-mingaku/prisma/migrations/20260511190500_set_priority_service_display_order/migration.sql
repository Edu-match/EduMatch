-- 指定サービスを「上から優先」の順で先頭表示にする
UPDATE "Service"
SET "display_order" = CASE
  WHEN "title" = 'ワンリード' THEN 0
  WHEN "title" = 'ZEP' THEN 1
  WHEN "title" = 'システムASSIST' THEN 2
  WHEN "title" = 'KAWASEMI Lite' THEN 3
  WHEN "title" = '株式会社V-Growth' THEN 4
  WHEN "title" = 'TERRACE' THEN 5
  WHEN "title" = 'aim@' THEN 6
  WHEN "title" = '塾シル' THEN 7
  ELSE "display_order"
END
WHERE "title" IN (
  'ワンリード',
  'ZEP',
  'システムASSIST',
  'KAWASEMI Lite',
  '株式会社V-Growth',
  'TERRACE',
  'aim@',
  '塾シル'
);
