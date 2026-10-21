const MENU_MAP = {
  "pre-k - 8 lunch menu": {
    name: "Pre-K - 8 Lunch Menu",
    short: "Pre-K – 8",
    halal: false,
  },
  "pre-k - 8 lunch menu with halal option": {
    name: "Pre-K - 8 Lunch Menu (Halal)",
    short: "Pre-K – 8 (Halal)",
    halal: true,
  },
  "pre-k - 8 vegetarian lunch menu": {
    name: "Pre-K - 8 Vegetarian Lunch Menu",
    short: "Pre-K – 8 Vegetarian",
    halal: false,
  },
  "pre-k - 8 express hot lunch menu": {
    name: "Pre-K - 8 Express Hot Lunch Menu",
    short: "Pre-K – 8 Express Hot",
    halal: false,
  },
  "pre-k - 8 express hot lunch menu with halal option": {
    name: "Pre-K - 8 Express Hot (Halal)",
    short: "Pre-K – 8 Express Hot (Halal)",
    halal: true,
  },
  "pre-k - 8 express cold lunch menu": {
    name: "Pre-K - 8 Express Cold Lunch Menu",
    short: "Pre-K – 8 Express Cold",
    halal: false,
  },
  "pre-k - 8 express cold lunch menu with halal option": {
    name: "Pre-K - 8 Express Cold (Halal)",
    short: "Pre-K – 8 Express Cold (Halal)",
    halal: true,
  },
  "high school lunch menu": {
    name: "High School Lunch Menu",
    short: "High School",
    halal: false,
  },
  "high school lunch menu with halal option": {
    name: "High School Lunch Menu (Halal)",
    short: "High School (Halal)",
    halal: true,
  },
  "high school express hot lunch menu": {
    name: "High School Express Hot Lunch Menu",
    short: "HS Express Hot",
    halal: false,
  },
  "high school express hot lunch menu with halal option": {
    name: "High School Express Hot (Halal)",
    short: "HS Express Hot (Halal)",
    halal: true,
  },
  "high school express cold lunch menu": {
    name: "High School Express Cold Lunch Menu",
    short: "HS Express Cold",
    halal: false,
  },
  "food court menu": {
    name: "Food Court Menu",
    short: "Food Court",
    halal: false,
  },
  "food court menu with halal option": {
    name: "Food Court Menu (Halal)",
    short: "Food Court (Halal)",
    halal: true,
  },
  "infant toddler lunch menu": {
    name: "Infant Toddler Lunch Menu",
    short: "Infant & Toddler",
    halal: false,
  },
};

function transform(input) {
  const customFields =
    (input &&
      input.trmnl &&
      input.trmnl.plugin_settings &&
      input.trmnl.plugin_settings.custom_fields_values) ||
    {};
  const rawMenu = String(customFields.menu_type || input.menu_type || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();

  const mapped = MENU_MAP[rawMenu] || MENU_MAP["pre-k - 8 lunch menu"];
  const menuName = input.menu_name || mapped.name;
  const menuShort = input.menu_short || mapped.short;
  const isHalal =
    typeof input.is_halal === "boolean"
      ? input.is_halal
      : mapped.halal || /halal/i.test(menuName);

  const rawNext = input.tomorrow || input.next_day_1 || null;
  const tomorrow = rawNext
    ? {
        ...rawNext,
        day_short: rawNext.day_short || rawNext.full_date || rawNext.date || "",
      }
    : null;

  return {
    ...input,
    menu_name: menuName,
    menu_short: menuShort,
    is_halal: isHalal,
    tomorrow: tomorrow,
  };
}
