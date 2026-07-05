exports.up = async (pgm) => {
  pgm.createIndex("symptom_entries", ["user_id", "logged_at"], {
    name: "idx_entries_user_logged",
    order: { logged_at: "DESC" },
  });

  pgm.createIndex("symptom_entries", ["user_id"], {
    name: "idx_entries_user",
  });

  pgm.sql(
    "CREATE INDEX idx_entries_symptoms ON symptom_entries USING GIN (symptoms)",
  );

  pgm.sql("CREATE INDEX idx_entries_tags ON symptom_entries USING GIN (tags)");

  pgm.createIndex("appointments", ["user_id", "scheduled_at"], {
    name: "idx_appointments_user_scheduled",
    order: { scheduled_at: "ASC" },
  });

  pgm.createIndex("correlations", ["user_id", "detected_at"], {
    name: "idx_correlations_user",
    order: { detected_at: "DESC" },
  });
};

exports.down = async (pgm) => {
  pgm.dropIndex("symptom_entries", [], { name: "idx_entries_user_logged" });
  pgm.dropIndex("symptom_entries", [], { name: "idx_entries_user" });
  pgm.sql("DROP INDEX IF EXISTS idx_entries_symptoms");
  pgm.sql("DROP INDEX IF EXISTS idx_entries_tags");
  pgm.dropIndex("appointments", [], {
    name: "idx_appointments_user_scheduled",
  });
  pgm.dropIndex("correlations", [], { name: "idx_correlations_user" });
};
