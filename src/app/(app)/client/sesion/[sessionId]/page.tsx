import { SessionDetailClient } from "./session-detail-client";

export function generateStaticParams() {
  return [{ sessionId: "demo-stub" }];
}

export default function ActiveSessionPage() {
  return <SessionDetailClient />;
}
