import schema from "../../../schema/numerical-neighbor-report.schema.json" with { type: "json" };

export function GET() {
  return new Response(JSON.stringify(schema, null, 2) + "\n", { headers: { "Content-Type": "application/schema+json" } });
}
