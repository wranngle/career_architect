// Optional Clay.com enrichment helper for job/company records.
export async function enrichJobWithClay(job) {
  if (!process.env.CLAY_API_KEY) {
    console.warn("CLAY_API_KEY not set. Skipping Clay enrichment.");
    return job;
  }

  try {
    const res = await fetch("https://api.clay.com/v3/enrich", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company: job.company_name }),
    });

    if (!res.ok) {
      throw new Error(`Clay API error: ${res.status}`);
    }

    const data = await res.json();
    return { ...job, enriched_data: data };
  } catch (err) {
    console.error("Failed to enrich with Clay:", err.message);
    return job;
  }
}

async function main() {
  console.log("Clay integration placeholder. Ready for pipeline ingestion.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
