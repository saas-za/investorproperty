-- Reference database of Desktop Land Estimate submissions.
--
-- This is a genuine change to what the tool promises: the estimate page and
-- terms of use previously said no property information is stored. Morné
-- asked for this directly — to build up a real record of net-developable
-- ratios, what's actually being built, and what it's selling at, so the
-- calibrated defaults stop being a guess and start being backed by data —
-- and the "no information stored" language has been updated everywhere it
-- appeared to say what is actually true now.
--
-- What is deliberately NOT here: no name, email or phone number (those exist
-- only in the separate, unstored contact-form email); no exact parcel key,
-- LPI code, erf number, or precise coordinates. Location is captured only at
-- municipality/registration-division level — a district like "Cape Town",
-- not a suburb or an address — because Morné said the area was the least
-- important of what he wanted and it is also the one piece most able to
-- re-identify a specific, still-being-negotiated site. If suburb-level
-- detail turns out to be worth the extra specificity for the house-price
-- tracking he mentioned, that is a deliberate follow-up decision, not a
-- default to fall into by storing more than was asked for.
create table if not exists estimate_submissions (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),

  -- Who is asking, never who they are. No FK to any identity — there isn't one.
  party                  text,   -- 'developer' | 'seller'

  -- Coarse location only — see the note above on why this stops short of a suburb.
  municipality           text,
  registration_division  text,

  -- The split Morné most wants calibrated: what fraction of a site is
  -- actually developable, as real people are entering it, not as assumed.
  gross_hectares         numeric,
  net_hectares           numeric,
  net_ratio              numeric,
  net_ratio_was_defaulted boolean,

  -- What's actually being built, and how the bulk was arrived at — this is
  -- the "flats or houses" signal.
  product_type           text,
  basis                  text,   -- 'density' | 'bulk' | 'basket'
  density_used           numeric,
  floor_factor           numeric,
  average_unit_size_m2   numeric,
  coverage               numeric,

  -- What it's planned to sell at, and what that implies.
  status                 text,
  average_unit_price     numeric,
  opportunities          numeric,
  land_value             numeric,

  -- The seller's own asking price, when one was given — the actual
  -- market-expectation signal, separate from what the calculation produces.
  seller_expectation     numeric,
  expectation_basis      text
);

-- RLS on with no policies at all: nothing here is ever read back through the
-- app, in either direction, so there is no case where a client-side key
-- should touch this table. Only the server, using the secret key that
-- bypasses RLS entirely, ever writes to it. Query it directly in the
-- Supabase SQL editor for the actual analysis.
alter table estimate_submissions enable row level security;

create index if not exists estimate_submissions_created_at_idx
  on estimate_submissions (created_at desc);
