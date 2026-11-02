import { sequelize } from '../config/database.js';
import { initUserModel } from './user.model.js';
import { initFavoriteModel } from './favorite.model.js';
import { initTeamModel } from './team.model.js';
import { initTeamMemberModel } from './team-member.model.js';

const User = initUserModel(sequelize);
const Favorite = initFavoriteModel(sequelize);
const Team = initTeamModel(sequelize);
const TeamMember = initTeamMemberModel(sequelize);

// Asociaciones
// Un usuario tiene muchos favoritos; cada favorito pertenece a un usuario.
User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites', onDelete: 'CASCADE' });
Favorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Un usuario tiene muchos equipos; un equipo tiene muchos miembros.
// Las FKs se declaran no nulas (mismo objeto en ambos lados para que no se pisen).
const teamUserFk = { name: 'userId', allowNull: false };
User.hasMany(Team, { foreignKey: teamUserFk, as: 'teams', onDelete: 'CASCADE' });
Team.belongsTo(User, { foreignKey: teamUserFk, as: 'user', onDelete: 'CASCADE' });

const memberTeamFk = { name: 'teamId', allowNull: false };
Team.hasMany(TeamMember, { foreignKey: memberTeamFk, as: 'members', onDelete: 'CASCADE' });
TeamMember.belongsTo(Team, { foreignKey: memberTeamFk, as: 'team', onDelete: 'CASCADE' });

export { sequelize, User, Favorite, Team, TeamMember };
