
exports.up = async (pgm) => {
  pgm.createTable('medications', {
    id: { type: 'serial', primaryKey: true },
    user_id: {
      type: 'integer',
      references: '"users"',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(100)', notNull: true },
    dosage: { type: 'varchar(50)' }, 
    frequency: { type: 'varchar(100)' }, 
    started_at: { type: 'date' },
    ended_at: { type: 'date' },
    prescribed_for: { type: 'text' },
    notes: { type: 'text' },
    active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });

  pgm.createTable('medication_logs', {
    id: { type: 'serial', primaryKey: true },
    medication_id: {
      type: 'integer',
      references: '"medications"',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'integer',
      references: '"users"',
      onDelete: 'CASCADE',
    },
    taken_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    notes: { type: 'text' },
    side_effects: { type: 'text' },
  });

  pgm.createTable('doctor_reports', {
    id: { type: 'serial', primaryKey: true },
    user_id: {
      type: 'integer',
      references: '"users"',
      onDelete: 'CASCADE',
    },
    appointment_id: {
      type: 'integer',
      references: '"appointments"',
      onDelete: 'SET NULL',
      notNull: false,
    },
    title: { type: 'varchar(255)', notNull: true },
    period_from: { type: 'date', notNull: true },
    period_to: { type: 'date', notNull: true },
    content: { type: 'text', notNull: true }, 
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });

  pgm.createIndex('medications', ['user_id', 'active'], {
    name: 'idx_medications_user_active',
  });

  pgm.createIndex('medication_logs', ['user_id', 'taken_at'], {
    name: 'idx_medication_logs_user',
    order: { taken_at: 'DESC' },
  });

  pgm.createIndex('doctor_reports', ['user_id', 'created_at'], {
    name: 'idx_doctor_reports_user',
    order: { created_at: 'DESC' },
  });
};

exports.down = async (pgm) => {
  pgm.dropTable('doctor_reports');
  pgm.dropTable('medication_logs');
  pgm.dropTable('medications');
};