exports.up = async (pgm) => {
  pgm.createTable("weekly_summaries", {
    id: { type: "serial", primaryKey: true },
    user_id: {
      type: "integer",
      references: '"users"',
      onDelete: "CASCADE",
    },
    week_start: { type: "date", notNull: true },
    total_entries: { type: "integer", default: 0 },
    avg_mood: { type: "numeric(4,2)" },
    avg_energy: { type: "numeric(4,2)" },
    avg_sleep: { type: "numeric(4,2)" },
    top_symptoms: {
      type: "jsonb",
      default: pgm.func("'[]'::jsonb"),
    },
    summary_text: { type: "text" },
    created_at: { type: "timestamp", default: pgm.func("NOW()") },
  });

  pgm.addConstraint(
    "weekly_summaries",
    "weekly_summaries_user_week_unique",
    "UNIQUE (user_id, week_start)",
  );

  pgm.createIndex("weekly_summaries", ["user_id", "week_start"], {
    name: "idx_weekly_summaries_user_week",
    order: { week_start: "DESC" },
  });
};

exports.down = async (pgm) => {
  pgm.dropTable("weekly_summaries");
};
