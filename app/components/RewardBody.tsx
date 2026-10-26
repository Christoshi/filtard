import { sanitizeRewardHtml } from "@/lib/reward-html";

export default function RewardBody({ html }: { html: string }) {
  const clean = sanitizeRewardHtml(html);
  if (!clean || clean === "<p></p>") return null;

  return <div className="reward-content" dangerouslySetInnerHTML={{ __html: clean }} />;
}
