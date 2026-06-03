const SOLE_DEFAULT_DAY_CONFIGS = {
1: {
  day_number: 1,
  label: "Baseline compatibility calibration",

  connection_quiz_budget: 28,
  connection_message_budget: 15,
  connection_task_budget: 0,

  attraction_quiz_budget: 28,
  attraction_message_budget: 10,
  attraction_task_budget: 0,

  task_confidence_budget: 8,
  reply_goal: 25,

  confidence_max: 46,
  connection_max: 48,
  attraction_max: 48,
  candidate_pool_min: 42000
},

  2: {
    day_number: 2,
    label: "Initial compatibility filtering",

    connection_quiz_budget: 38,
    connection_message_budget: 11,
    connection_task_budget: 0,

    attraction_quiz_budget: 35,
    attraction_message_budget: 10,
    attraction_task_budget: 0,

    task_confidence_budget: 10,
reply_goal: 50,

    confidence_max: 62,
    connection_max: 64,
    attraction_max: 64,
    candidate_pool_min: 14500
  },

  3: {
    day_number: 3,
    label: "Conversational style mapping",

    connection_quiz_budget: 48,
    connection_message_budget: 9,
    connection_task_budget: 0,

    attraction_quiz_budget: 49,
    attraction_message_budget: 8,
    attraction_task_budget: 0,

    task_confidence_budget: 12,
reply_goal: 75,

    confidence_max: 78,
    connection_max: 80,
    attraction_max: 78,
    candidate_pool_min: 2400
  },

  4: {
    day_number: 4,
    label: "Behavioural alignment in progress",

    connection_quiz_budget: 58,
    connection_message_budget: 7,
    connection_task_budget: 0,

    attraction_quiz_budget: 59,
    attraction_message_budget: 6,
    attraction_task_budget: 0,

    task_confidence_budget: 12,
reply_goal: 75,

    confidence_max: 90,
    connection_max: 92,
    attraction_max: 90,
    candidate_pool_min: 83
  },

  5: {
    day_number: 5,
    label: "Final compatibility resolution",

    connection_quiz_budget: 72,
    connection_message_budget: 6,
    connection_task_budget: 0,

    attraction_quiz_budget: 73,
    attraction_message_budget: 5,
    attraction_task_budget: 0,

    task_confidence_budget: 14,
reply_goal: 100,

    confidence_max: 100,
    connection_max: 96,
    attraction_max: 96,
    candidate_pool_min: 1
  }
};

let soleDayConfigCache = null;

function normaliseDayConfigRow(row = {}) {
  const dayNumber = Math.max(1, Math.min(5, Math.round(Number(row.day_number || row.day || 1))));

  const fallback = SOLE_DEFAULT_DAY_CONFIGS[dayNumber];

  return {
    ...fallback,
    ...row,
    day_number: dayNumber,

    connection_quiz_budget: Number(row.connection_quiz_budget ?? fallback.connection_quiz_budget),
    connection_message_budget: Number(row.connection_message_budget ?? fallback.connection_message_budget),
    connection_task_budget: Number(row.connection_task_budget ?? fallback.connection_task_budget),

    attraction_quiz_budget: Number(row.attraction_quiz_budget ?? fallback.attraction_quiz_budget),
    attraction_message_budget: Number(row.attraction_message_budget ?? fallback.attraction_message_budget),
    attraction_task_budget: Number(row.attraction_task_budget ?? fallback.attraction_task_budget),

    task_confidence_budget: Number(row.task_confidence_budget ?? fallback.task_confidence_budget ?? 0),
reply_goal: Math.round(Number(row.reply_goal ?? fallback.reply_goal ?? 50)),

    confidence_max: Number(row.confidence_max ?? fallback.confidence_max),
    connection_max: Number(row.connection_max ?? fallback.connection_max),
    attraction_max: Number(row.attraction_max ?? fallback.attraction_max),
    candidate_pool_min: Math.round(Number(row.candidate_pool_min ?? fallback.candidate_pool_min))
  };
}

function getDefaultExperimentDayConfigs() {
  return Object.values(SOLE_DEFAULT_DAY_CONFIGS).map(normaliseDayConfigRow);
}

async function loadExperimentDayConfigs(sb, { force = false } = {}) {
  if (!force && soleDayConfigCache) {
    return soleDayConfigCache;
  }

  if (!sb) {
    soleDayConfigCache = getDefaultExperimentDayConfigs();
    return soleDayConfigCache;
  }

  const { data, error } = await sb
    .from("experiment_day_configs")
    .select("*")
    .order("day_number", { ascending: true });

  if (error) {
    console.warn("loadExperimentDayConfigs failed", error);
    soleDayConfigCache = getDefaultExperimentDayConfigs();
    return soleDayConfigCache;
  }

  const byDay = new Map(
    (data || []).map(row => {
      const normalised = normaliseDayConfigRow(row);
      return [normalised.day_number, normalised];
    })
  );

  soleDayConfigCache = [1, 2, 3, 4, 5].map(dayNumber => {
    return byDay.get(dayNumber) || normaliseDayConfigRow({ day_number: dayNumber });
  });

  return soleDayConfigCache;
}

async function saveExperimentDayConfig(sb, dayNumber, patch = {}) {
  if (!sb) throw new Error("Missing Supabase client.");

  const safeDay = Math.max(1, Math.min(5, Math.round(Number(dayNumber) || 1)));
  const fallback = normaliseDayConfigRow({ day_number: safeDay });
  const next = normaliseDayConfigRow({
    ...fallback,
    ...patch,
    day_number: safeDay
  });

  const payload = {
    day_number: safeDay,
    label: String(next.label || fallback.label || `Day ${safeDay}`),

    connection_quiz_budget: next.connection_quiz_budget,
    connection_message_budget: next.connection_message_budget,
    connection_task_budget: next.connection_task_budget,

    attraction_quiz_budget: next.attraction_quiz_budget,
    attraction_message_budget: next.attraction_message_budget,
    attraction_task_budget: next.attraction_task_budget,

    task_confidence_budget: next.task_confidence_budget,
reply_goal: next.reply_goal,

    confidence_max: next.confidence_max,
    connection_max: next.connection_max,
    attraction_max: next.attraction_max,
    candidate_pool_min: next.candidate_pool_min,

    updated_at: new Date().toISOString()
  };

  const { data, error } = await sb
    .from("experiment_day_configs")
    .upsert(payload, { onConflict: "day_number" })
    .select("*")
    .single();

  if (error) throw error;

  soleDayConfigCache = null;

  return normaliseDayConfigRow(data);
}

function getExperimentDayConfigFromCache(dayNumber) {
  const safeDay = Math.max(1, Math.min(5, Math.round(Number(dayNumber) || 1)));
  const cached = soleDayConfigCache?.find(item => item.day_number === safeDay);

  return cached || normaliseDayConfigRow({ day_number: safeDay });
}

let soleExperimentSettingsCache = null;

function normaliseExperimentSettings(row = {}) {
  const currentDay = Math.max(
    1,
    Math.min(5, Math.round(Number(row.current_day || row.currentDay || 1)))
  );

  return {
    id: 1,
    current_day: currentDay,
    updated_at: row.updated_at || null,
    updated_by: row.updated_by || null
  };
}

async function loadExperimentSettings(sb, { force = false } = {}) {
  if (!force && soleExperimentSettingsCache) {
    return soleExperimentSettingsCache;
  }

  if (!sb) {
    soleExperimentSettingsCache = normaliseExperimentSettings({ current_day: 1 });
    return soleExperimentSettingsCache;
  }

  const { data, error } = await sb
    .from("experiment_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn("loadExperimentSettings failed", error);
    soleExperimentSettingsCache = normaliseExperimentSettings({ current_day: 1 });
    return soleExperimentSettingsCache;
  }

  soleExperimentSettingsCache = normaliseExperimentSettings(data || { current_day: 1 });
  return soleExperimentSettingsCache;
}

async function saveExperimentCurrentDay(sb, currentDay) {
  if (!sb) throw new Error("Missing Supabase client.");

  const safeDay = Math.max(
    1,
    Math.min(5, Math.round(Number(currentDay) || 1))
  );

  const { data, error } = await sb
    .from("experiment_settings")
    .upsert(
      {
        id: 1,
        current_day: safeDay,
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) throw error;

  soleExperimentSettingsCache = normaliseExperimentSettings(data);
  return soleExperimentSettingsCache;
}

function getExperimentSettingsFromCache() {
  return soleExperimentSettingsCache || normaliseExperimentSettings({ current_day: 1 });
}

window.soleDayConfigs = {
  getDefaultExperimentDayConfigs,
  loadExperimentDayConfigs,
  saveExperimentDayConfig,
  getExperimentDayConfigFromCache,
  normaliseDayConfigRow,

  loadExperimentSettings,
  saveExperimentCurrentDay,
  getExperimentSettingsFromCache,
  normaliseExperimentSettings
};
