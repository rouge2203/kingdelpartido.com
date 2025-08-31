import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { FaCrown, FaCheck } from "react-icons/fa6";
import { FaRunning, FaExchangeAlt, FaUserTie } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import logo from "../assets/monkey_logo.png";
import monkeyPointing from "../assets/monkey_pointing.png";
import monkeyPointingRightSm from "../assets/monkey_pointing_right_sm.png";

type Team = { id: string; name: string; badge: string };
type Player = {
  id: string;
  name: string;
  photo: string;
  dt?: boolean;
  substitute?: boolean;
  teamId: string;
};

const DEMO_ASSETS = {
  alajuelenseBadge:
    "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/badges/liga.png",
  saprissaBadge:
    "https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/badges/saprissa.png",
  marianoTorres:
    "https://images.fotmob.com/image_resources/playerimages/110884.png",
  celsoBorges: "https://images.fotmob.com/image_resources/playerimages/51953.png",
  vladimirQuesada:
    "https://images.fotmob.com/image_resources/playerimages/1456991.png",
  oscarRamirez:
    "https://images.fotmob.com/image_resources/playerimages/304809.png",
};

function Demo() {
  // Mock teams
  const teamHome: Team = {
    id: "home",
    name: "Alajuelense",
    badge: DEMO_ASSETS.alajuelenseBadge,
  };
  const teamVisit: Team = {
    id: "visit",
    name: "Saprissa",
    badge: DEMO_ASSETS.saprissaBadge,
  };

  // Mock players (1 per team) and DTs
  const playersHome: Player[] = [
    {
      id: "celso",
      name: "Celso Borges",
      photo: DEMO_ASSETS.celsoBorges,
      teamId: teamHome.id,
    },
  ];
  const playersVisit: Player[] = [
    {
      id: "mariano",
      name: "Mariano Torres",
      photo: DEMO_ASSETS.marianoTorres,
      teamId: teamVisit.id,
      substitute: true,
    },
  ];
  const playersDt: Player[] = [
    {
      id: "oscar",
      name: "Óscar Ramírez",
      photo: DEMO_ASSETS.oscarRamirez,
      teamId: teamHome.id,
      dt: true,
    },
    {
      id: "vladimir",
      name: "Vladimir Quesada",
      photo: DEMO_ASSETS.vladimirQuesada,
      teamId: teamVisit.id,
      dt: true,
    },
  ];

  const [activeTeam, setActiveTeam] = useState<"home" | "visit" | "dt">(
    "home"
  );
  const [currentHomeIndex, setCurrentHomeIndex] = useState(0);
  const [currentVisitIndex, setCurrentVisitIndex] = useState(0);
  const [currentDtIndex, setCurrentDtIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [selectedKing, setSelectedKing] = useState<string | null>(null);

  const getCurrentPlayer = (): Player | null => {
    switch (activeTeam) {
      case "home":
        return playersHome[currentHomeIndex] || null;
      case "visit":
        return playersVisit[currentVisitIndex] || null;
      case "dt":
        return playersDt[currentDtIndex] || null;
      default:
        return null;
    }
  };

  const getCurrentTeam = (): Team | null => {
    const p = getCurrentPlayer();
    if (!p) return null;
    if (p.teamId === teamHome.id) return teamHome;
    if (p.teamId === teamVisit.id) return teamVisit;
    return null;
  };

  const getCurrentIndex = () =>
    activeTeam === "home"
      ? currentHomeIndex
      : activeTeam === "visit"
      ? currentVisitIndex
      : currentDtIndex;
  const getCurrentCount = () =>
    activeTeam === "home"
      ? playersHome.length
      : activeTeam === "visit"
      ? playersVisit.length
      : playersDt.length;

  const isFirst = getCurrentIndex() === 0;
  const isLast = getCurrentIndex() === getCurrentCount() - 1;
  const currentPlayer = getCurrentPlayer();
  const currentTeam = getCurrentTeam();
  const currentRating = currentPlayer ? ratings[currentPlayer.id] : undefined;

  const handlePrev = () => {
    if (activeTeam === "home" && !isFirst)
      setCurrentHomeIndex((i) => i - 1);
    if (activeTeam === "visit" && !isFirst)
      setCurrentVisitIndex((i) => i - 1);
    if (activeTeam === "dt" && !isFirst) setCurrentDtIndex((i) => i - 1);
  };
  const handleNext = () => {
    if (activeTeam === "home" && !isLast) setCurrentHomeIndex((i) => i + 1);
    if (activeTeam === "visit" && !isLast)
      setCurrentVisitIndex((i) => i + 1);
    if (activeTeam === "dt" && !isLast) setCurrentDtIndex((i) => i + 1);
  };

  const handleRate = (value: number) => {
    if (!currentPlayer) return;
    setRatings((prev) => ({ ...prev, [currentPlayer.id]: value }));
  };

  const handleSelectKing = (playerId: string, isDt?: boolean) => {
    if (isDt) return; // no King for DTs
    setSelectedKing((k) => (k === playerId ? null : playerId));
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 sm:pt-10 justify-center items-center">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4">
        <img src={logo} alt="logo" className="size-10" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-yellow-400">
            Demo interactiva
          </h1>
          <p className="text-gray-400 text-sm">
            Explora cómo calificar jugadores y elegir el King del Partido.
          </p>
        </div>
      </div>

      {/* Dashboard preview */}
      <div className="space-y-2 mb-6">
        <p className="text-gray-300 text-sm">Así verás los partidos:</p>
        <div className="flex flex-col space-y-3 bg-card border items-center border-gray-600 bg-primary p-4 rounded-lg shadow-md shadow-black">
          <p className="text-white w-full text-center text-base font-semibold">
            Primera División
          </p>
          <div className="flex flex-row items-center justify-between w-full">
            <div className="flex flex-col items-center space-y-1 w-1/3">
              <img className="size-10 aspect-square" src={teamHome.badge} />
              <p className="text-white text-base font-medium">{teamHome.name}</p>
            </div>
            <p className="text-gray-400 w-1/3 text-center text-2xl sm:text-3xl font-medium">
              2 - 2
            </p>
            <div className="flex flex-col items-center space-y-1 w-1/3">
              <img className="size-10 aspect-square" src={teamVisit.badge} />
              <p className="text-white text-base font-medium">{teamVisit.name}</p>
            </div>
          </div>
          <button
            disabled
            className="opacity-90 cursor-not-allowed border border-yellow-500 flex items-center justify-center gap-1 p-2 text-sm text-white rounded-md shadow-md shadow-yellow-500/50"
            title="Crea una cuenta para calificar"
          >
            <FaCrown className="text-yellow-500 text-sm inline" />
            Calificar jugadores
          </button>
        </div>
      </div>

      {/* Match preview */}
      <div className="bg-card border border-gray-600 bg-primary rounded-lg p-4 shadow-md shadow-black">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img className="size-6" src={teamHome.badge} />
            <span className="text-white text-sm font-medium">{teamHome.name}</span>
          </div>
          <span className="text-gray-400 text-xs">Demo — sin guardar</span>
          <div className="flex items-center gap-2">
            <img className="size-6" src={teamVisit.badge} />
            <span className="text-white text-sm font-medium">{teamVisit.name}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { key: "home", label: teamHome.name },
            { key: "visit", label: teamVisit.name },
            { key: "dt", label: "DT" },
          ].map((t: any) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTeam(t.key);
              }}
              className={`py-2 rounded-md border text-sm font-medium transition-colors ${
                activeTeam === t.key
                  ? "border-yellow-500 text-yellow-500"
                  : "border-gray-600 text-white hover:text-yellow-500 hover:border-yellow-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className={`p-2 rounded-full border ${
              isFirst
                ? "border-gray-600 text-gray-600 cursor-not-allowed"
                : "border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
            }`}
          >
            <FaChevronLeft />
          </button>

          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Jugador {getCurrentIndex() + 1} de {getCurrentCount()}
            </p>
            <p className="text-yellow-500 text-xs font-medium mt-1">
              {activeTeam === "home"
                ? teamHome.name
                : activeTeam === "visit"
                ? teamVisit.name
                : "DT"}
            </p>
          </div>

          <button
            onClick={handleNext}
            disabled={isLast}
            className={`p-2 rounded-full border ${
              isLast
                ? "border-gray-600 text-gray-600 cursor-not-allowed"
                : "border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
            }`}
          >
            <FaChevronRight />
          </button>
        </div>

        {/* Current player */}
        {currentPlayer && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <img
                className="size-16 aspect-square rounded-full object-cover"
                src={currentPlayer.photo}
                alt={`${currentPlayer.name} photo`}
              />
              <div>
                <h3 className="text-white text-xl font-semibold">
                  {currentPlayer.name}
                </h3>
                <p
                  className={`text-sm font-medium flex items-center gap-1 ${
                    currentPlayer.substitute
                      ? "text-orange-400"
                      : currentPlayer.dt
                      ? "text-blue-400"
                      : "text-green-400"
                  }`}
                >
                  {currentPlayer.substitute && !currentPlayer.dt ? (
                    <FaExchangeAlt className="inline" />
                  ) : currentPlayer.dt ? (
                    <FaUserTie className="inline" />
                  ) : (
                    <FaRunning className="inline" />
                  )}
                  {currentPlayer.substitute && !currentPlayer.dt
                    ? "Cambio"
                    : currentPlayer.dt
                    ? "Entrenador"
                    : "Titular"}
                </p>
              </div>
            </div>

            {currentTeam && (
              <div className="flex flex-col items-center space-y-1">
                <img className="size-8 aspect-square" src={currentTeam.badge} />
                <p className="text-white text-xs font-medium text-center">
                  {currentTeam.name}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Ratings */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => handleRate(n)}
              className={`p-3 rounded-lg font-semibold text-lg border transition-all ${
                currentRating === n
                  ? "bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/50"
                  : "bg-transparent text-white border-gray-600 hover:border-yellow-500 hover:text-yellow-500"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* King selection */}
        {currentPlayer && (
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => handleSelectKing(currentPlayer.id, currentPlayer.dt)}
              disabled={!!currentPlayer.dt}
              className={`flex items-center border border-gray-600 text-sm sm:text-lg justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                currentPlayer.dt
                  ? "text-gray-400 cursor-not-allowed"
                  : selectedKing === currentPlayer.id
                  ? "text-yellow-500"
                  : "text-white hover:text-yellow-500"
              }`}
            >
              <FaCrown className="text-sm sm:text-lg" />
              {currentPlayer.dt
                ? "No disponible para DT"
                : selectedKing === currentPlayer.id
                ? "Mi King del Partido"
                : "Elegir como King del Partido"}
            </button>

            <div className="text-right">
              {currentRating && (
                <p className="text-green-400 text-sm sm:text-base font-medium">
                  Calificado: {currentRating}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Save (disabled) */}
        <div className="mt-6 pt-6 border-t border-gray-600">
          <button
            disabled
            className="w-full py-3 rounded-lg font-semibold bg-gray-600 text-gray-300 cursor-not-allowed"
            title="Crea una cuenta para guardar tus votos"
          >
            Subir calificaciones (demo)
          </button>

          <div className="mt-3 text-center text-gray-400 text-sm">
            Crea una cuenta para guardar y competir en el ranking.
          </div>
        </div>
      </div>

      {/* Reglas del juego */}
      <div className="w-full max-w-2xl border bg-card border-gray-600 bg-primary p-4 rounded-lg shadow-md shadow-black my-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="hidden sm:flex w-full sm:w-1/2 justify-center order-1">
            <img src={monkeyPointing} alt="Reglas del juego" className="max-h-40 object-contain" />
          </div>
          <div className="w-full sm:w-1/2 order-2">
            <h3 className="text-white text-lg font-semibold mb-2 flex items-center gap-2">
              <img src={monkeyPointingRightSm} alt="" className="size-14 object-contain sm:hidden" />
              Reglas del juego
            </h3>
            <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
              <li>
                Una puntuación de <span className="text-yellow-500 font-bold">6</span> es el equivalente a un <span className="text-yellow-500 font-bold">regular</span>.
              </li>
              <li>
                Debes elegir un solo <span className="text-yellow-500 font-bold">King del Partido</span>.
              </li>
              <li>Debes calificar a todos los jugadores antes de subir tus calificaciones.</li>
              <li>El promedio es la media de las calificaciones de todos los usuarios a un jugador.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Vista de partido ya calificado */}
      <div className="w-full max-w-2xl border border-gray-600 bg-primary p-4 rounded-lg shadow-md shadow-black mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-base text-left text-yellow-500 flex items-center gap-1.5 font-medium">
            <FaCheck className="inline" /> Ya calificaste este partido
          </p>
        </div>

        {/* Kings comparison */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaCrown className="text-yellow-500" />
              <span className="text-white text-sm sm:text-base">Tu King del Partido</span>
            </div>
            <div className="flex items-center gap-2">
              <img className="size-8 aspect-square rounded-full object-cover" src={DEMO_ASSETS.celsoBorges} alt="Celso Borges" />
              <span className="text-white text-sm sm:text-base font-medium">Celso Borges</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaCrown className="text-yellow-500" />
              <span className="text-white text-sm sm:text-base">King de la gente</span>
            </div>
            <div className="flex items-center gap-2">
              <img className="size-8 aspect-square rounded-full object-cover" src={DEMO_ASSETS.marianoTorres} alt="Mariano Torres" />
              <span className="text-white text-sm sm:text-base font-medium">Mariano Torres</span>
              <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500 text-yellow-400 text-xs sm:text-sm font-semibold">62%</span>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <p className="text-white text-base font-medium mb-2">Tus calificaciones</p>
          <div className="divide-y divide-gray-700">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <img className="size-8 aspect-square rounded-full object-cover" src={DEMO_ASSETS.celsoBorges} alt="Celso Borges" />
                <div className="flex flex-col">
                  <span className="text-white text-sm">Celso Borges</span>
                  <span className="text-gray-400 text-xs">Promedio: 7.6</span>
                </div>
              </div>
              <div className="text-green-400 text-sm sm:text-base font-semibold">8</div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <img className="size-8 aspect-square rounded-full object-cover" src={DEMO_ASSETS.marianoTorres} alt="Mariano Torres" />
                <div className="flex flex-col">
                  <span className="text-white text-sm">Mariano Torres</span>
                  <span className="text-gray-400 text-xs">Promedio: 7.1</span>
                </div>
              </div>
              <div className="text-green-400 text-sm sm:text-base font-semibold">7</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="flex flex-col self-center">
          <span className="text-gray-400 text-sm">Powered by</span>
          <a
            href="https://lobsterlabs.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://mafisa-group-assets.nyc3.cdn.digitaloceanspaces.com/kingdelpartido/assets/lobster_logo_white.png"
              alt="lobster logo"
              className="h-4 w-auto"
            />
          </a>
        </div>
        <div className="flex gap-2">
          <Link
            to="/signup"
            className="text-white px-4 py-2 rounded-md border border-yellow-500 hover:bg-yellow-500 hover:text-black"
          >
            Crear cuenta
          </Link>
          <NavLink
            to="/login"
            className="text-white px-4 py-2 rounded-md border border-gray-600 hover:cursor-pointer"
          >
            Volver al Inicio
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export default Demo;
