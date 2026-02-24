import type { Affiliate, AffiliateNetwork } from "../types";

type CreateAffiliateData = Omit<Affiliate, "id" | "click_count">;

// ─── Read ─────────────────────────────────────────────────────────────────────
export async function getAffiliates(db: D1Database): Promise<Affiliate[]> {
  const result = await db
    .prepare("SELECT * FROM affiliates WHERE active = 1 ORDER BY name ASC")
    .all<Affiliate>();

  return result.results;
}

export async function getAffiliateById(
  db: D1Database,
  id: number
): Promise<Affiliate | null> {
  return db
    .prepare("SELECT * FROM affiliates WHERE id = ? LIMIT 1")
    .bind(id)
    .first<Affiliate>();
}

export async function getAffiliatesByNiche(
  db: D1Database,
  keywords: string
): Promise<Affiliate[]> {
  const terms = keywords
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 5);

  if (terms.length === 0) return [];

  // Build dynamic LIKE conditions
  const conditions = terms.map(() => "niche_keywords LIKE ?").join(" OR ");
  const bindings = terms.map((t) => `%${t}%`);

  const result = await db
    .prepare(
      `SELECT * FROM affiliates WHERE active = 1 AND (${conditions}) ORDER BY click_count DESC LIMIT 5`
    )
    .bind(...bindings)
    .all<Affiliate>();

  return result.results;
}

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createAffiliate(
  db: D1Database,
  data: CreateAffiliateData
): Promise<Affiliate> {
  const result = await db
    .prepare(
      `INSERT INTO affiliates
       (name, network, affiliate_id, base_url, tracking_params, niche_keywords, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(
      data.name,
      data.network,
      data.affiliate_id,
      data.base_url,
      data.tracking_params,
      data.niche_keywords,
      data.active
    )
    .first<Affiliate>();

  if (!result) throw new Error("Failed to create affiliate");
  return result;
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateAffiliate(
  db: D1Database,
  id: number,
  data: Partial<CreateAffiliateData>
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f] ?? null);

  await db
    .prepare(`UPDATE affiliates SET ${setClause} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteAffiliate(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM affiliates WHERE id = ?").bind(id).run();
}

// ─── Track click ──────────────────────────────────────────────────────────────
export async function trackClick(
  db: D1Database,
  affiliateId: number
): Promise<void> {
  await db
    .prepare(
      "UPDATE affiliates SET click_count = click_count + 1 WHERE id = ?"
    )
    .bind(affiliateId)
    .run();
}

// ─── Seed affiliates from env config ─────────────────────────────────────────
export async function seedAffiliatesFromConfig(
  db: D1Database,
  config: {
    booking_affiliate_id: string;
    getyourguide_affiliate_id: string;
    viator_affiliate_id: string;
    amazon_associate_id: string;
    niche: string;
  }
): Promise<void> {
  type NetworkSeed = {
    name: string;
    network: AffiliateNetwork;
    affiliateId: string;
    baseUrl: string;
    params: string;
  };

  const seeds: NetworkSeed[] = [
    {
      name: "Booking.com",
      network: "booking",
      affiliateId: config.booking_affiliate_id,
      baseUrl: "https://www.booking.com",
      params: JSON.stringify({ aid: config.booking_affiliate_id }),
    },
    {
      name: "GetYourGuide",
      network: "getyourguide",
      affiliateId: config.getyourguide_affiliate_id,
      baseUrl: "https://www.getyourguide.com",
      params: JSON.stringify({ partner_id: config.getyourguide_affiliate_id }),
    },
    {
      name: "Viator",
      network: "viator",
      affiliateId: config.viator_affiliate_id,
      baseUrl: "https://www.viator.com",
      params: JSON.stringify({ pid: config.viator_affiliate_id }),
    },
    {
      name: "Amazon",
      network: "amazon",
      affiliateId: config.amazon_associate_id,
      baseUrl: "https://www.amazon.com",
      params: JSON.stringify({ tag: config.amazon_associate_id }),
    },
  ];

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO affiliates
     (name, network, affiliate_id, base_url, tracking_params, niche_keywords, active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  );

  const batch = seeds
    .filter((s) => s.affiliateId)
    .map((s) =>
      stmt.bind(
        s.name,
        s.network,
        s.affiliateId,
        s.baseUrl,
        s.params,
        config.niche
      )
    );

  if (batch.length > 0) {
    await db.batch(batch);
  }
}
