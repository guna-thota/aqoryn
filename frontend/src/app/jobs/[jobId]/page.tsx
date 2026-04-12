import JobDetailClient from "./client";

export function generateStaticParams() {
  return [{ jobId: "550e8400" }, { jobId: "661f9511" }, { jobId: "772g0622" }];
}

export default function JobDetailPage() {
  return <JobDetailClient />;
}
