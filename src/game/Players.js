export const PLAYER_MODELS = [
  { id: "sas", name: "SAS", team: "ct", folder: "sas" },
  { id: "urban", name: "SEAL Team 6", team: "ct", folder: "urban" },
  { id: "gign", name: "GIGN", team: "ct", folder: "gign" },
  { id: "gsg9", name: "GSG-9", team: "ct", folder: "gsg9" },
  { id: "leet", name: "Phoenix Connexion", team: "t", folder: "leet" },
  { id: "terror", name: "Elite Crew", team: "t", folder: "terror" },
  { id: "arctic", name: "Arctic Avengers", team: "t", folder: "arctic" },
  { id: "guerilla", name: "Guerilla Warfare", team: "t", folder: "guerilla" },
];

export const DEFAULT_CT = "sas";
export const DEFAULT_T = "leet";

export function playerById(id) {
  return PLAYER_MODELS.find((p) => p.id === id) || PLAYER_MODELS[0];
}

export function playersForTeam(team) {
  return PLAYER_MODELS.filter((p) => p.team === team);
}
