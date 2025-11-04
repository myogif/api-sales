module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TYPE "enum_users_role" RENAME TO "enum_users_role_old";',
        { transaction },
      );

      await queryInterface.sequelize.query(
        "CREATE TYPE \"enum_users_role\" AS ENUM('MANAGER', 'SUPERVISOR', 'SALES', 'SERVICE_CENTER');",
        { transaction },
      );

      await queryInterface.sequelize.query(
        'ALTER TABLE "users" ALTER COLUMN "role" TYPE "enum_users_role" USING "role"::text::"enum_users_role";',
        { transaction },
      );

      await queryInterface.sequelize.query(
        'DROP TYPE "enum_users_role_old";',
        { transaction },
      );
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        "UPDATE \"users\" SET \"role\" = 'MANAGER' WHERE \"role\" = 'SERVICE_CENTER';",
        { transaction },
      );

      await queryInterface.sequelize.query(
        'ALTER TYPE "enum_users_role" RENAME TO "enum_users_role_old";',
        { transaction },
      );

      await queryInterface.sequelize.query(
        "CREATE TYPE \"enum_users_role\" AS ENUM('MANAGER', 'SUPERVISOR', 'SALES');",
        { transaction },
      );

      await queryInterface.sequelize.query(
        'ALTER TABLE "users" ALTER COLUMN "role" TYPE "enum_users_role" USING "role"::text::"enum_users_role";',
        { transaction },
      );

      await queryInterface.sequelize.query(
        'DROP TYPE "enum_users_role_old";',
        { transaction },
      );
    });
  },
};
