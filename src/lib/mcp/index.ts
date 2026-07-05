import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyReport from "./tools/get-my-report";
import getMyRoadmap from "./tools/get-my-roadmap";
import completeTask from "./tools/complete-task";

// The OAuth issuer MUST be the direct Supabase host. On publish, SUPABASE_URL
// is rewritten to the `.lovable.cloud` proxy, which mcp-js rejects (RFC 8414
// issuer mismatch). Read the project ref via import.meta.env so Vite inlines
// it as a literal at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "untrap-mcp",
  title: "UNTRAP",
  version: "0.1.0",
  instructions:
    "Tools for the UNTRAP AI career companion. Read the signed-in student's career report and 30-day roadmap, and mark roadmap tasks complete.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyReport, getMyRoadmap, completeTask],
});
