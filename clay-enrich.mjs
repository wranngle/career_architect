// Optional Clay.com enrichment helper for job/company records.
import {readFileSync} from 'fs';

export async function enrichJobWithClay(job) {
  if (!process.env.CLAY_API_KEY) {
    console.warn('CLAY_API_KEY not set. Returning the input job unchanged.');
    return job;
  }

  const company = job.company_name || job.company;
  if (!company) {
    throw new Error('Job record must include company_name or company.');
  }

  try {
    const res = await fetch('https://api.clay.com/v3/enrich', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CLAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({company}),
    });

    if (!res.ok) {
      throw new Error(`Clay API error: ${res.status}`);
    }

    const data = await res.json();
    return {...job, enriched_data: data};
  } catch (err) {
    console.error('Failed to enrich with Clay:', err.message);
    return job;
  }
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.log('Usage: node clay-enrich.mjs <job.json|->');
    console.log('Pass - to read a single job JSON object from stdin.');
    return;
  }

  const raw = inputPath === '-'
    ? readFileSync(0, 'utf8')
    : readFileSync(inputPath, 'utf8');
  const job = JSON.parse(raw);
  const enriched = await enrichJobWithClay(job);
  console.log(JSON.stringify(enriched, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
