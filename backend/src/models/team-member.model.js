import { DataTypes, Model } from 'sequelize';

/**
 * Pokémon que forma parte de un equipo. Guarda el id y nombre canónicos
 * devueltos por la PokeAPI.
 *
 * Un equipo no puede repetir el mismo pokémon (índice único compuesto
 * team_id + pokemon_id).
 */
export class TeamMember extends Model {}

export function initTeamMemberModel(sequelize) {
  TeamMember.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      pokemonId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      pokemonName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // Foto y tipos guardados al crear el equipo (ver ADR-0014).
      sprite: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      types: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: 'TeamMember',
      tableName: 'team_members',
      indexes: [{ unique: true, fields: ['team_id', 'pokemon_id'] }],
    },
  );

  return TeamMember;
}
