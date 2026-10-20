/**
 * TRMNL NYC Public Schools Lunch Menu Plugin — Cloudflare Worker
 *
 * GET /lunch?menu={menu_name_or_slug}&date={optional_YYYY-MM-DD}
 *
 * Returns NYC Public Schools lunch menu for the current (or next) school day
 * and the next 3 upcoming school days.
 *
 * ── Data Source ──────────────────────────────────────────────────────────────
 *   NYC Department of Education (DOE) Official School Menus CSVs:
 *   https://www.schools.nyc.gov/docs/default-source/school-menus/{school_year}/{month}/{filename}.csv
 *
 *   Each monthly CSV contains:
 *     - Row 1: Header (`Date,Menu`)
 *     - Row 2: `Daily Offerings,{item1|item2|...}`
 *     - Row 3+: `Month Day; Year?DayOfWeek (Optional Holiday),{item1|item2|...}`
 */

const BASE_CSV_URL = "https://www.schools.nyc.gov/docs/default-source/school-menus";

export interface MenuMeta {
  key: string;
  name: string;
  shortName: string;
  filename: string;
}

/**
 * Supported NYC Public Schools Lunch Menus.
 * New menus can be added here by appending an entry to this list.
 */
export const NYC_MENUS: MenuMeta[] = [
  {
    key: "pre-k-8-lunch",
    name: "Pre-K - 8 Lunch Menu",
    shortName: "Pre-K – 8",
    filename: "pre-k---8-lunch-menu.csv",
  },
  {
    key: "pre-k-8-lunch-halal",
    name: "Pre-K - 8 Lunch Menu With Halal Option",
    shortName: "Pre-K – 8 (Halal)",
    filename: "pre-k---8-lunch-menu-with-halal-option.csv",
  },
  {
    key: "pre-k-8-vegetarian",
    name: "Pre-K - 8 Vegetarian Lunch Menu",
    shortName: "Pre-K – 8 Vegetarian",
    filename: "pre-k---8-vegetarian-lunch-menu.csv",
  },
  {
    key: "pre-k-8-express-hot",
    name: "Pre-K - 8 Express Hot Lunch Menu",
    shortName: "Pre-K – 8 Express Hot",
    filename: "pre-k---8-express-hot-lunch-menu.csv",
  },
  {
    key: "pre-k-8-express-hot-halal",
    name: "Pre-K - 8 Express Hot Lunch Menu With Halal Option",
    shortName: "Pre-K – 8 Express Hot (Halal)",
    filename: "pre-k---8-express-hot-lunch-menu-with-halal-option.csv",
  },
  {
    key: "pre-k-8-express-cold",
    name: "Pre-K - 8 Express Cold Lunch Menu",
    shortName: "Pre-K – 8 Express Cold",
    filename: "Pre-K---8-Express-Cold-Lunch-Menu.csv",
  },
  {
    key: "pre-k-8-express-cold-halal",
    name: "Pre-K - 8 Express Cold Lunch Menu With Halal Option",
    shortName: "Pre-K – 8 Express Cold (Halal)",
    filename: "pre-k---8-express-cold-lunch-menu-with-halal-option.csv",
  },
  {
    key: "high-school-lunch",
    name: "High School Lunch Menu",
    shortName: "High School",
    filename: "high-school-lunch-menu.csv",
  },
  {
    key: "high-school-lunch-halal",
    name: "High School Lunch Menu With Halal Option",
    shortName: "High School (Halal)",
    filename: "high-school-lunch-menu-with-halal-option.csv",
  },
  {
    key: "high-school-express-hot",
    name: "High School Express Hot Lunch Menu",
    shortName: "HS Express Hot",
    filename: "high-school-express-hot-lunch-menu.csv",
  },
  {
    key: "high-school-express-hot-halal",
    name: "High School Express Hot Lunch Menu With Halal Option",
    shortName: "HS Express Hot (Halal)",
    filename: "high-school-express-hot-lunch-menu-with-halal-option.csv",
  },
  {
    key: "high-school-express-cold",
    name: "High School Express Cold Lunch Menu",
    shortName: "HS Express Cold",
    filename: "High-School-Express-Cold-Lunch-Menu.csv",
  },
  {
    key: "food-court",
    name: "Food Court Menu",
    shortName: "Food Court",
    filename: "food-court-menu.csv",
  },
  {
    key: "food-court-halal",
    name: "Food Court Menu With Halal Option",
    shortName: "Food Court (Halal)",
    filename: "food-court-menu-with-halal-option.csv",
  },
  {
    key: "infant-toddler",
    name: "Infant Toddler Lunch Menu",
    shortName: "Infant & Toddler",
    filename: "Infant-Toddler-Lunch-Menu.csv",
  },
];

const DEFAULT_MENU: MenuMeta = NYC_MENUS[0]; // Pre-K - 8 Lunch Menu

/**
 * Resolves user-selected menu parameter from TRMNL dropdown or query string.
 */
function resolveMenu(param: string | null): MenuMeta {
  if (!param) return DEFAULT_MENU;
  const trimmed = param.trim();
  if (!trimmed || trimmed.includes("{{") || trimmed.includes("}}")) {
    return DEFAULT_MENU;
  }

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedParam = normalize(trimmed);

  // 1. Exact match on name, key, shortName, or filename (with or without .csv)
  const exact = NYC_MENUS.find(
    (m) =>
      normalize(m.name) === normalizedParam ||
      normalize(m.key) === normalizedParam ||
      normalize(m.shortName) === normalizedParam ||
      normalize(m.filename) === normalizedParam ||
      normalize(m.filename.replace(/\.csv$/i, "")) === normalizedParam
  );
  if (exact) return exact;

  // 2. Partial match
  const partial = NYC_MENUS.find(
    (m) =>
      normalize(m.name).includes(normalizedParam) ||
      normalize(m.key).includes(normalizedParam)
  );
  if (partial) return partial;

  return DEFAULT_MENU;
}

// ── Date & School Year Helpers ───────────────────────────────────────────────

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const SHORT_DAYS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

/**
 * Returns today's YYYY-MM-DD in America/New_York timezone (or validates an override).
 */
function getTargetIsoDate(dateParam: string | null): string {
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam.trim())) {
    return dateParam.trim();
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "10";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/**
 * Computes NYC DOE school year folder (e.g. "2026-2027") and month slug (e.g. "october")
 * for a given year and 1-based month number.
 */
function getSchoolYearAndMonth(year: number, month: number): { schoolYear: string; monthSlug: string } {
  const startYear = month >= 7 ? year : year - 1;
  const schoolYear = `${startYear}-${startYear + 1}`;
  const monthSlug = MONTH_NAMES[month - 1];
  return { schoolYear, monthSlug };
}

function formatUpdatedAt(): string {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
}

// ── CSV Fetching & Parsing ───────────────────────────────────────────────────

export interface DayMenu {
  date: string;
  full_date: string;
  day_short: string;
  status_label: string;
  items: string[];
  summary: string;
  salad_bar: string | null;
  note: string | null;
}

interface ParsedDayMenu extends DayMenu {
  iso_date: string;
}

/**
 * Cleans and merges raw `|`-delimited menu items from NYC DOE CSV.
 */
function parseMenuItems(rawMenu: string): {
  items: string[];
  saladBar: string | null;
  theme: string | null;
} {
  const rawParts = rawMenu
    .split("|")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0 && s !== "#REF!");

  // Merge multi-cell continuations (e.g., "Chicken Tenders" | "with Dipping Sauce",
  // "Plastic Free" | "Lunch Day", "Sweet Plantain Bowl with" | "Veggie Nuggets (VE)" | "Or" | "Crispy Chicken Bites")
  const merged: string[] = [];
  for (let i = 0; i < rawParts.length; i++) {
    const curr = rawParts[i];
    const prev = merged.length > 0 ? merged[merged.length - 1] : null;

    if (prev) {
      const prevEndsWithConnector =
        /\b(with|or|and|on a)$/i.test(prev) ||
        /^Honey Mustard$/i.test(prev) ||
        (/^Plastic Free$/i.test(prev) && /^Lunch Day$/i.test(curr));
      const currStartsWithConnector = /^(with|or|and|on a)\b/i.test(curr);

      if (prevEndsWithConnector || currStartsWithConnector) {
        merged[merged.length - 1] = `${prev} ${curr}`;
        continue;
      }
    }
    merged.push(curr);
  }

  let theme: string | null = null;
  const items: string[] = [];
  const bars: string[] = [];

  for (const item of merged) {
    if (/^Plastic Free Lunch Day$/i.test(item)) {
      theme = "Plastic Free Lunch Day";
    } else if (/^Salad Bar$/i.test(item)) {
      bars.push("Salad Bar");
    } else if (/\bBar\b/i.test(item)) {
      bars.push(item);
    } else {
      items.push(item);
    }
  }

  const specificBars = bars.filter((b) => !/^Salad Bar$/i.test(b));
  const saladBar =
    specificBars.length > 0
      ? specificBars.join(" • ")
      : bars.length > 0
      ? "Salad Bar"
      : null;

  return { items, saladBar, theme };
}

/**
 * Parses a single NYC DOE monthly CSV text into sorted DayMenu entries.
 */
function parseMonthlyCsv(csvText: string, targetIsoDate: string): ParsedDayMenu[] {
  const lines = csvText.trim().split(/\r?\n/);
  const days: ParsedDayMenu[] = [];

  for (const line of lines) {
    const braceIdx = line.indexOf(",{");
    if (braceIdx === -1) continue;

    const rawDateCol = line.slice(0, braceIdx).trim();
    if (/^Daily Offering/i.test(rawDateCol) || /^Date$/i.test(rawDateCol)) {
      continue;
    }

    const trimmedLine = line.trim();
    const rawMenuCol = trimmedLine.slice(
      braceIdx + 2,
      trimmedLine.endsWith("}") ? -1 : undefined
    );

    // Example rawDateCol:
    //   "October 20; 2026?Tuesday"
    //   "October 12; 2026?Monday (Italian Heritage/Indigenous Peoples' Day)"
    const dateMatch = rawDateCol.match(
      /^([A-Za-z]+)\s+(\d{1,2});\s*(\d{4})\??([A-Za-z]+)?(?:\s*\(([^)]+)\))?/
    );
    if (!dateMatch) continue;

    const [, monthStr, dayStr, yearStr, weekdayRaw, holidayNote] = dateMatch;
    const monthIdx = MONTH_NAMES.indexOf(monthStr.toLowerCase());
    if (monthIdx === -1) continue;

    const yearNum = parseInt(yearStr, 10);
    const monthNum = monthIdx + 1;
    const dayNum = parseInt(dayStr, 10);

    const isoDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const shortMonth = SHORT_MONTHS[monthIdx];
    const dateFormatted = `${shortMonth} ${dayNum}`;

    const dayName = weekdayRaw
      ? weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1).toLowerCase()
      : "";
    const dayShort =
      (weekdayRaw && SHORT_DAYS[weekdayRaw.toLowerCase()]) ||
      dayName.slice(0, 3);

    const { items, saladBar, theme } = parseMenuItems(rawMenuCol);
    if (items.length === 0 && !saladBar) continue;

    const noteParts = [holidayNote?.trim(), theme].filter(Boolean);
    const note = noteParts.length > 0 ? noteParts.join(" • ") : null;

    const isToday = isoDate === targetIsoDate;
    const displayItems = items.length > 0 ? items : saladBar ? [saladBar] : [];

    days.push({
      iso_date: isoDate,
      date: dateFormatted,
      full_date: dayShort ? `${dayShort}, ${dateFormatted}` : dateFormatted,
      day_short: dayShort,
      status_label: isToday ? "TODAY'S LUNCH" : "NEXT SCHOOL DAY",
      items: displayItems,
      summary: displayItems.join(" • "),
      salad_bar: saladBar,
      note,
    });
  }

  return days.sort((a, b) => a.iso_date.localeCompare(b.iso_date));
}

/**
 * Fetches a monthly CSV from NYC DOE. Returns empty string if unpublished or 404.
 */
async function fetchMonthCsv(
  schoolYear: string,
  monthSlug: string,
  filename: string
): Promise<string> {
  const url = `${BASE_CSV_URL}/${schoolYear}/${monthSlug}/${filename}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) return "";
  const text = await res.text();
  if (!text.trim().startsWith("Date,Menu")) return "";
  return text;
}

// ── Main Data Builder ────────────────────────────────────────────────────────

async function getMenuData(menu: MenuMeta, targetIsoDate: string) {
  const [yStr, mStr] = targetIsoDate.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);

  const curr = getSchoolYearAndMonth(year, month);
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const nextYearNum = month === 12 ? year + 1 : year;
  const next = getSchoolYearAndMonth(nextYearNum, nextMonthNum);

  // Fetch current month CSV first
  const currCsv = await fetchMonthCsv(curr.schoolYear, curr.monthSlug, menu.filename);
  let allDays = currCsv ? parseMonthlyCsv(currCsv, targetIsoDate) : [];

  // Filter to target date or later
  let upcoming = allDays.filter((d) => d.iso_date >= targetIsoDate);

  // If fewer than 4 school days remain in the current month, also fetch next month's CSV
  if (upcoming.length < 4) {
    const nextCsv = await fetchMonthCsv(next.schoolYear, next.monthSlug, menu.filename);
    if (nextCsv) {
      const nextDays = parseMonthlyCsv(nextCsv, targetIsoDate);
      allDays = [...allDays, ...nextDays];
      upcoming = allDays.filter((d) => d.iso_date >= targetIsoDate);
    }
  }

  // Fallback: if no upcoming days found (e.g. end of month before next month is published),
  // show the most recent available days from the current month so the screen isn't blank.
  if (upcoming.length === 0 && allDays.length > 0) {
    upcoming = allDays.slice(-4);
  }

  const toDayMenu = ({ iso_date: _iso, ...rest }: ParsedDayMenu): DayMenu => rest;
  const currentDay = upcoming[0] ? toDayMenu(upcoming[0]) : null;
  const nextDays = upcoming.slice(1, 4).map(toDayMenu);

  return {
    menu_name: menu.name,
    menu_short: menu.shortName,
    school_year: curr.schoolYear,
    current_day: currentDay,
    next_day_1: nextDays[0] ?? null,
    next_day_2: nextDays[1] ?? null,
    next_day_3: nextDays[2] ?? null,
    no_menu: currentDay === null,
    updated_at: formatUpdatedAt(),
  };
}

// ── Worker Entrypoint ────────────────────────────────────────────────────────

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({
          status: "ok",
          plugin: "TRMNL NYC Public Schools Lunch Menu",
          menus: NYC_MENUS.map((m) => m.name),
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.pathname !== "/lunch" && url.pathname !== "/menu") {
      return new Response("Not Found", { status: 404 });
    }

    const rawMenu = url.searchParams.get("menu") ?? url.searchParams.get("type");
    const dateParam = url.searchParams.get("date");
    const menu = resolveMenu(rawMenu);
    const targetIsoDate = getTargetIsoDate(dateParam);

    try {
      const data = await getMenuData(menu, targetIsoDate);

      const responsePayload = {
        ...data,
        merge_variables: data,
      };

      const cacheHeader = data.no_menu
        ? "no-store, no-cache"
        : "public, max-age=1800";

      return new Response(JSON.stringify(responsePayload), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": cacheHeader,
        },
      });
    } catch (err: any) {
      console.error("NYC School Lunch fetch error:", err);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch NYC school lunch menu",
          detail: err?.message ?? String(err),
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
