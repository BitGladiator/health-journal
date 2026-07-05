exports.up = async (pgm) => {
  pgm.createTable("users", {
    id: { type: "serial", primaryKey: true },
    google_id: { type: "varchar(100)", unique: true, notNull: true },
    email: { type: "varchar(255)", unique: true, notNull: true },
    name: { type: "varchar(100)", notNull: true },
    avatar_url: { type: "text" },
    created_at: { type: "timestamp", default: pgm.func("NOW()") },
    updated_at: { type: "timestamp", default: pgm.func("NOW()") },
  });
  pgm.createTable("symptom_entries", {
    id: { type: "serial", primaryKey: true },
    user_id: {
      type: "integer",
      references: '"users"',
      onDelete: "CASCADE",
    },
    logged_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },

    raw_input: { type: "text", notNull: true },
    symptoms: { type: "jsonb", default: "'[]'" },

    mood: { type: "integer" },
    energy_level: { type: "integer" },
    sleep_hours: { type: "numeric(4,1)" },
    notes: { type: "text" },
    tags: { type: "jsonb", default: "'[]'" },
  });

  pgm.createTable("appointments", {
    id: { type: "serial", primaryKey: true },
    user_id: {
      type: "integer",
      references: '"users"',
      onDelete: "CASCADE",
    },
    doctor_name: { type: "varchar(100)" },
    appointment_type: { type: "varchar(100)" },
    scheduled_at: { type: "timestamptz", notNull: true },
    notes: { type: "text" },
    briefing_generated: { type: "boolean", default: false },
    briefing: { type: "text" },
    created_at: { type: "timestamp", default: pgm.func("NOW()") },
  });

  pgm.createTable("correlations", {
    id: { type: "serial", primaryKey: true },
    user_id: {
      type: "integer",
      references: '"users"',
      onDelete: "CASCADE",
    },
    correlation_type: { type: "varchar(50)", notNull: true },
    description: { type: "text", notNull: true },
    confidence: { type: "numeric(4,2)" },
    data_points: { type: "integer" },
    detected_at: { type: "timestamp", default: pgm.func("NOW()") },
    dismissed: { type: "boolean", default: false },
  });
};

exports.down = async (pgm) => {
  pgm.dropTable("correlations");
  pgm.dropTable("appointments");
  pgm.dropTable("symptom_entries");
  pgm.dropTable("users");
};
