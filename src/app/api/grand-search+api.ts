declare const require: (name: string) => any;

const fs = require('fs');
const path = require('path');
const processRef = require('process');

export async function POST(request: Request) {
  const body = await request.json();
  const filePath = path.join(processRef.cwd(), 'assets', 'json', 'grand_search.json');
  const payload = {
    generated_from: 'grand_with_chapters.json',
    generated_at: new Date().toISOString(),
    results: body.results ?? {},
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return Response.json({ ok: true, saved: filePath });
}
