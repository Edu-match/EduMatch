"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Calendar,
  MapPin,
  Users,
  Clock,
  Video,
  Building,
} from "lucide-react";
import { eventTypes, formats, events } from "@/lib/events-data";

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState("all");

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesType = selectedType === "all" || event.type === selectedType;
    const matchesFormat =
      selectedFormat === "all" || event.format === selectedFormat;
    return matchesSearch && matchesType && matchesFormat;
  });

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "online":
        return <Video className="h-4 w-4" />;
      case "offline":
        return <Building className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  const getFormatLabel = (format: string) => {
    return formats.find((f) => f.value === format)?.label || format;
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">セミナー・イベント情報</h1>
        <p className="text-muted-foreground mb-2">
          教育関連のセミナー・イベント情報をお届けします。
        </p>
        <p className="text-sm text-muted-foreground">
          掲載されていないセミナー・イベント情報は
          <Link href="/contact" className="text-primary hover:underline font-medium mx-1">
            お問い合わせフォーム
          </Link>
          からご報告ください。
        </p>
      </div>

      {/* 検索・フィルター */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="イベント名やキーワードで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="イベント種別" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedFormat} onValueChange={setSelectedFormat}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="開催形式" />
            </SelectTrigger>
            <SelectContent>
              {formats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredEvents.length}件のイベントが見つかりました
        </div>
      </div>

      {/* イベント一覧 */}
      <div className="space-y-4">
        {filteredEvents.map((event) => (
          <Card key={event.id} className="overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="relative h-48 md:h-auto md:w-64 flex-shrink-0">
                <Image
                  src={event.image}
                  alt={event.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <CardContent className="p-5 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {event.featured && (
                    <Badge className="bg-amber-500 hover:bg-amber-600">注目</Badge>
                  )}
                  <Badge>
                    {eventTypes.find((t) => t.value === event.type)?.label}
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {getFormatIcon(event.format)}
                    {getFormatLabel(event.format)}
                  </Badge>
                  {event.price === "無料" && (
                    <Badge className="bg-green-500 hover:bg-green-600">無料</Badge>
                  )}
                </div>

                <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                <p className="text-muted-foreground mb-4 line-clamp-2">
                  {event.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(event.date).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {event.time}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {event.registered}/{event.capacity}名
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {event.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary">
                    {event.price}
                  </span>
                  <Button asChild>
                    <Link href={`/events/${event.id}`}>詳細・申込</Link>
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            条件に一致するイベントが見つかりませんでした
          </p>
        </div>
      )}
    </div>
  );
}
