import { DataTypes, Model } from 'sequelize';

/**
 * Equipo Pokémon de un usuario. Sus miembros viven en `TeamMember`
 * (máx. 6, regla aplicada en `teams.service.js`).
 */
export class Team extends Model {}

export function initTeamModel(sequelize) {
  Team.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Team',
      tableName: 'teams',
    },
  );

  return Team;
}
