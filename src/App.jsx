import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

// Kleine Übersicht um Turnierbaum und Ergebnisse anzuzeigen
function Overview({ rounds, bronzeMatch, finalMatch, winners }) {
  return (
    <div className="bg-chamGreen/5 border border-chamGreen/20 rounded-2xl p-4 md:w-64 w-full">
      <h2 className="text-xl font-bold mb-2 text-chamGreen">Turnierbaum</h2>
      {rounds.map((r, idx) => (
        <div key={idx} className="mb-4">
          <h3 className="font-semibold text-chamGreen mb-1">Runde {idx + 1}</h3>
          {r.matches.map((m) => (
            <div key={m.id} className="flex justify-between text-sm">
              <span>{m.player1.name}</span>
              <span className="mx-1">vs.</span>
              <span>{m.player2.name}</span>
              {m.winner && (
                <span className="ml-2 text-chamGreen font-bold">🏆 {m.winner.name}</span>
              )}
            </div>
          ))}
        </div>
      ))}
      {bronzeMatch && (
        <div className="mb-4">
          <h3 className="font-semibold text-chamGold mb-1">Spiel um Platz 3</h3>
          <div className="flex justify-between text-sm">
            <span>{bronzeMatch.player1.name}</span>
            <span className="mx-1">vs.</span>
            <span>{bronzeMatch.player2.name}</span>
            {bronzeMatch.winner && (
              <span className="ml-2 text-chamGold font-bold">🏅 {bronzeMatch.winner.name}</span>
            )}
          </div>
        </div>
      )}
      {finalMatch && (
        <div className="mb-4">
          <h3 className="font-semibold text-chamGreen mb-1">Finale</h3>
          <div className="flex justify-between text-sm">
            <span>{finalMatch.player1.name}</span>
            <span className="mx-1">vs.</span>
            <span>{finalMatch.player2.name}</span>
            {finalMatch.winner && (
              <span className="ml-2 text-chamGreen font-bold">🏆 {finalMatch.winner.name}</span>
            )}
          </div>
        </div>
      )}
      {winners.length > 0 && (
        <div>
          <h3 className="font-semibold text-chamGreen mb-1">Platzierungen</h3>
          <ol className="list-decimal pl-4 text-sm space-y-1">
            {winners.map((w, i) => (
              <li key={i}>{w.name}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

function getNextPowerOfTwo(n) {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

// --- KO Turnier Logik inkl. Freilose (so früh wie möglich) ---
function createInitialMatches(participants) {
  const shuffled = shuffle([...participants]);
  const numParticipants = shuffled.length;
  const powerOfTwo = getNextPowerOfTwo(numParticipants);
  const numByes = powerOfTwo - numParticipants;

  // Freilose ganz am Anfang zufällig einstreuen
  let matches = [];
  let i = 0;
  let byesLeft = numByes;

  while (i < shuffled.length) {
    if (byesLeft > 0) {
      matches.push({
        id: uuidv4(),
        player1: shuffled[i],
        player2: { name: "Freilos", isBye: true },
        winner: null,
      });
      byesLeft--;
      i++;
    } else if (i + 1 < shuffled.length) {
      matches.push({
        id: uuidv4(),
        player1: shuffled[i],
        player2: shuffled[i + 1],
        winner: null,
      });
      i += 2;
    } else {
      // Odd man out (shouldn't happen, but safe fallback)
      matches.push({
        id: uuidv4(),
        player1: shuffled[i],
        player2: { name: "Freilos", isBye: true },
        winner: null,
      });
      i++;
    }
  }

  return matches;
}

// Next round, pairing winners, never again byes after first round
function createNextRound(matches) {
  const winners = matches.map(m => m.winner);
  let nextMatches = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      nextMatches.push({
        id: uuidv4(),
        player1: winners[i],
        player2: winners[i + 1],
        winner: null,
      });
    }
  }
  // Falls ungerade, "Geisterspieler" durchrutschen lassen (kann nur aus Freilos entstehen)
  if (winners.length % 2 === 1) {
    nextMatches.push({
      id: uuidv4(),
      player1: winners[winners.length - 1],
      player2: { name: "Freilos", isBye: true },
      winner: winners[winners.length - 1],
    });
  }
  return nextMatches;
}

const STAGE = {
  ENTRY: "ENTRY",
  MATCHES: "MATCHES",
  SEMIS: "SEMIS",
  BRONZE: "BRONZE",
  FINAL: "FINAL",
  AWARD: "AWARD",
};

export default function App() {
  // 1. Teilnehmer eingeben
  const [participantName, setParticipantName] = useState("");
  const [participants, setParticipants] = useState([]);
  const [stage, setStage] = useState(STAGE.ENTRY);
  const [rounds, setRounds] = useState([]);
  const [currentMatches, setCurrentMatches] = useState([]);
  const [roundNum, setRoundNum] = useState(0);
  const [bronzeMatch, setBronzeMatch] = useState(null);
  const [finalMatch, setFinalMatch] = useState(null);
  const [winners, setWinners] = useState([]);

  // Teilnehmer:innen hinzufügen
  function addParticipant() {
    if (
      participantName.trim().length > 0 &&
      !participants.some((p) => p.name === participantName.trim())
    ) {
      setParticipants([
        ...participants,
        { name: participantName.trim(), id: uuidv4() },
      ]);
      setParticipantName("");
    }
  }

  // Teilnehmer:innen löschen
  function removeParticipant(id) {
    setParticipants(participants.filter((p) => p.id !== id));
  }

  // Start: Turnierbaum bauen
  function startTournament() {
    if (participants.length < 2) return;
    const matches = createInitialMatches(participants);
    setCurrentMatches(matches);
    setRounds([{ matches }]);
    setStage(STAGE.MATCHES);
    setRoundNum(1);
  }

  // Sieger:in für ein Match auswählen
  function pickWinner(matchId, winner) {
    setCurrentMatches((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, winner } : m
      )
    );
    setRounds((prev) =>
      prev.map((round, idx) => {
        if (idx !== roundNum - 1) return round;
        return {
          ...round,
          matches: round.matches.map((m) =>
            m.id === matchId ? { ...m, winner } : m
          ),
        };
      })
    );
  }

  // Runde abschließen
  function finishRound() {
    // Wenn Halbfinale: Bronze vorbereiten
    if (currentMatches.length === 2 && stage === STAGE.MATCHES) {
      // Die Verlierer:innen spielen um Platz 3
      const [m1, m2] = currentMatches;
      setBronzeMatch({
        id: uuidv4(),
        player1: m1.winner === m1.player1 ? m1.player2 : m1.player1,
        player2: m2.winner === m2.player1 ? m2.player2 : m2.player1,
        winner: null,
      });
      setFinalMatch({
        id: uuidv4(),
        player1: m1.winner,
        player2: m2.winner,
        winner: null,
      });
      setStage(STAGE.BRONZE);
    } else if (stage === STAGE.BRONZE && bronzeMatch.winner) {
      setStage(STAGE.FINAL);
    } else if (stage === STAGE.FINAL && finalMatch.winner) {
      // Siegerehrung!
      const platz3 = bronzeMatch.winner;
      const platz2 = finalMatch.winner === finalMatch.player1 ? finalMatch.player2 : finalMatch.player1;
      const platz1 = finalMatch.winner;
      setWinners([platz1, platz2, platz3]);
      setStage(STAGE.AWARD);
    } else {
      // Normale Runde (Achtel, Viertel, etc.)
      const allDone = currentMatches.every((m) => m.winner);
      if (!allDone) return;
      const next = createNextRound(currentMatches);
      setRounds((r) => [...r, { matches: next }]);
      setCurrentMatches(next);
      setRoundNum(roundNum + 1);
    }
  }

  // Bronze/FinaI Sieger:in wählen
  function pickSpecialWinner(type, winner) {
    if (type === "bronze") setBronzeMatch((m) => ({ ...m, winner }));
    if (type === "final") setFinalMatch((m) => ({ ...m, winner }));
  }

  // Animations-Varianten
  const animationVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { type: "spring", bounce: 0.4 } },
    exit: { scale: 0.5, opacity: 0 },
  };

  // Siegerehrung-Animation
  const podiumAnim = {
    hidden: { y: 80, opacity: 0 },
    visible: (custom) => ({
      y: 0, opacity: 1,
      transition: { delay: custom * 0.3, type: "spring" }
    })
  };

  // Reset
  function resetAll() {
    setStage(STAGE.ENTRY);
    setParticipants([]);
    setParticipantName("");
    setRounds([]);
    setCurrentMatches([]);
    setRoundNum(0);
    setBronzeMatch(null);
    setFinalMatch(null);
    setWinners([]);
  }

  // --- UI ---
  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8 px-2">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-chamGreen drop-shadow-lg">Chamäleon Tischtennis Turnier</h1>
        <p className="text-chamGold text-xl text-center mt-2">KO-System • Siegerehrung • Live Spaß!</p>
      </header>

      <div className="flex flex-col md:flex-row w-full justify-center items-start gap-8">
        <div className="flex-1 flex flex-col items-center">

      {stage === STAGE.ENTRY && (
        <motion.div
          className="bg-chamGreen/10 rounded-2xl shadow-xl p-8 max-w-lg w-full flex flex-col items-center"
          {...animationVariants}
        >
          <h2 className="text-2xl font-semibold mb-4 text-chamGreen">Teilnehmer:innen eingeben</h2>
          <div className="flex w-full mb-4">
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="flex-1 rounded-xl border-2 border-chamGreen px-4 py-2 text-lg mr-2 focus:outline-none"
              placeholder="Name"
              onKeyDown={e => e.key === "Enter" && addParticipant()}
            />
            <button
              className="bg-chamGreen text-white px-6 py-2 rounded-xl font-bold hover:bg-chamGreen/80"
              onClick={addParticipant}
            >Hinzufügen</button>
          </div>
          <div className="w-full max-h-48 overflow-y-auto">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-white border-b border-chamGreen/10 py-2 px-2 rounded-lg">
                <span className="text-lg">{p.name}</span>
                <button
                  onClick={() => removeParticipant(p.id)}
                  className="text-red-400 hover:text-red-700 ml-2 font-bold text-xl"
                >&times;</button>
              </div>
            ))}
          </div>
          <button
            className="mt-6 bg-chamGold text-chamGreen px-8 py-3 rounded-2xl text-xl font-bold shadow-lg hover:bg-yellow-400 transition"
            disabled={participants.length < 2}
            onClick={startTournament}
          >
            Turnier starten
          </button>
        </motion.div>
      )}

      {stage === STAGE.MATCHES && (
        <motion.div
          className="bg-chamGreen/10 rounded-2xl shadow-xl p-6 max-w-xl w-full flex flex-col items-center"
          {...animationVariants}
        >
          <h2 className="text-2xl font-bold mb-2 text-chamGreen">Runde {roundNum}</h2>
          <div className="w-full space-y-3 mb-4">
            {currentMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-white border-2 border-chamGreen/30 p-3 rounded-xl">
                <span className="font-bold text-lg">{m.player1.name}</span>
                <span className="text-chamGold font-bold text-2xl">vs.</span>
                <span className="font-bold text-lg">{m.player2.name}</span>
                <div className="flex space-x-2 ml-4">
                  {!m.winner && !m.player1.isBye && (
                    <>
                      <button className="bg-chamGreen text-white rounded-xl px-4 py-1 hover:bg-chamGreen/80 font-semibold"
                        onClick={() => pickWinner(m.id, m.player1)}
                      >{m.player1.name}</button>
                      {!m.player2.isBye && (
                        <button className="bg-chamGold text-chamGreen rounded-xl px-4 py-1 hover:bg-yellow-400 font-semibold"
                          onClick={() => pickWinner(m.id, m.player2)}
                        >{m.player2.name}</button>
                      )}
                    </>
                  )}
                  {m.winner && (
                    <span className="ml-2 text-chamGreen font-bold">🏆 {m.winner.name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-4 bg-chamGreen text-white px-6 py-2 rounded-xl font-bold hover:bg-chamGreen/80"
            onClick={finishRound}
            disabled={!currentMatches.every((m) => m.winner)}
          >Runde abschließen</button>
        </motion.div>
      )}

      {stage === STAGE.BRONZE && (
        <AnimatePresence>
          <motion.div
            className="bg-chamGold/20 border-chamGold border-4 rounded-2xl shadow-2xl p-8 max-w-xl w-full flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <motion.h2
              className="text-3xl font-extrabold text-chamGold mb-6"
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { type: "spring", bounce: 0.3 } }}
            >
              Spiel um Platz 3 🥉
            </motion.h2>
            <div className="flex items-center justify-between bg-white border-2 border-chamGold/60 p-4 rounded-xl mb-4">
              <span className="font-bold text-xl">{bronzeMatch.player1.name}</span>
              <span className="text-chamGold font-bold text-2xl">vs.</span>
              <span className="font-bold text-xl">{bronzeMatch.player2.name}</span>
              <div className="flex space-x-2 ml-4">
                {!bronzeMatch.winner && (
                  <>
                    <button className="bg-chamGold text-chamGreen rounded-xl px-4 py-1 font-semibold"
                      onClick={() => pickSpecialWinner("bronze", bronzeMatch.player1)}
                    >{bronzeMatch.player1.name}</button>
                    <button className="bg-chamGold text-chamGreen rounded-xl px-4 py-1 font-semibold"
                      onClick={() => pickSpecialWinner("bronze", bronzeMatch.player2)}
                    >{bronzeMatch.player2.name}</button>
                  </>
                )}
                {bronzeMatch.winner && (
                  <span className="ml-2 text-chamGold font-bold">🏅 {bronzeMatch.winner.name}</span>
                )}
              </div>
            </div>
            <button
              className="mt-4 bg-chamGold text-chamGreen px-8 py-3 rounded-2xl text-xl font-bold shadow-lg hover:bg-yellow-400"
              disabled={!bronzeMatch.winner}
              onClick={finishRound}
            >Weiter zum Finale</button>
          </motion.div>
        </AnimatePresence>
      )}

      {stage === STAGE.FINAL && (
        <AnimatePresence>
          <motion.div
            className="bg-chamGreen/20 border-chamGreen border-4 rounded-2xl shadow-2xl p-8 max-w-xl w-full flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <motion.h2
              className="text-3xl font-extrabold text-chamGreen mb-6"
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { type: "spring", bounce: 0.3 } }}
            >
              FINALE 🏁
            </motion.h2>
            <div className="flex items-center justify-between bg-white border-2 border-chamGreen/60 p-4 rounded-xl mb-4">
              <span className="font-bold text-xl">{finalMatch.player1.name}</span>
              <span className="text-chamGreen font-bold text-2xl">vs.</span>
              <span className="font-bold text-xl">{finalMatch.player2.name}</span>
              <div className="flex space-x-2 ml-4">
                {!finalMatch.winner && (
                  <>
                    <button className="bg-chamGreen text-white rounded-xl px-4 py-1 font-semibold"
                      onClick={() => pickSpecialWinner("final", finalMatch.player1)}
                    >{finalMatch.player1.name}</button>
                    <button className="bg-chamGreen text-white rounded-xl px-4 py-1 font-semibold"
                      onClick={() => pickSpecialWinner("final", finalMatch.player2)}
                    >{finalMatch.player2.name}</button>
                  </>
                )}
                {finalMatch.winner && (
                  <span className="ml-2 text-chamGreen font-bold">🏆 {finalMatch.winner.name}</span>
                )}
              </div>
            </div>
            <button
              className="mt-4 bg-chamGreen text-white px-8 py-3 rounded-2xl text-xl font-bold shadow-lg hover:bg-chamGreen/80"
              disabled={!finalMatch.winner}
              onClick={finishRound}
            >Siegerehrung!</button>
          </motion.div>
        </AnimatePresence>
      )}

      {stage === STAGE.AWARD && (
        <AnimatePresence>
          <motion.div
            className="bg-gradient-to-tr from-chamGreen to-chamGold rounded-2xl shadow-2xl p-10 max-w-xl w-full flex flex-col items-center"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { type: "spring" } }}
          >
            <motion.h2
              className="text-4xl font-extrabold text-white mb-10"
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { type: "spring", bounce: 0.3 } }}
            >
              🎉 Siegerehrung 🎉
            </motion.h2>
            <div className="w-full flex justify-center items-end space-x-6 h-64 mt-10 mb-8">
              {/* Platz 2 */}
              <motion.div
                custom={0.2}
                initial="hidden"
                animate="visible"
                variants={podiumAnim}
                className="flex flex-col items-center"
              >
                <div className="bg-chamGold text-chamGreen font-bold rounded-t-2xl rounded-b-lg px-6 py-4 text-2xl shadow-xl">2</div>
                <div className="bg-white text-chamGold rounded-xl px-4 py-6 mt-2 shadow-lg border-4 border-chamGold font-bold text-xl">{winners[1]?.name}</div>
              </motion.div>
              {/* Platz 1 */}
              <motion.div
                custom={0}
                initial="hidden"
                animate="visible"
                variants={podiumAnim}
                className="flex flex-col items-center"
              >
                <div className="bg-chamGreen text-white font-bold rounded-t-2xl rounded-b-lg px-8 py-6 text-4xl shadow-2xl border-4 border-chamGold">1</div>
                <div className="bg-white text-chamGreen rounded-xl px-6 py-10 mt-2 shadow-2xl border-4 border-chamGreen font-extrabold text-2xl">{winners[0]?.name}</div>
              </motion.div>
              {/* Platz 3 */}
              <motion.div
                custom={0.4}
                initial="hidden"
                animate="visible"
                variants={podiumAnim}
                className="flex flex-col items-center"
              >
                <div className="bg-chamGold/80 text-chamGreen font-bold rounded-t-2xl rounded-b-lg px-5 py-3 text-xl shadow-md">3</div>
                <div className="bg-white text-chamGold rounded-xl px-3 py-4 mt-2 shadow-lg border-4 border-chamGold font-bold">{winners[2]?.name}</div>
              </motion.div>
            </div>
            <motion.div
              className="text-center text-white text-2xl font-semibold mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 1 } }}
            >
              Glückwunsch an alle Gewinner:innen!<br />
              Danke fürs Mitmachen.
            </motion.div>
            <button
              className="mt-12 bg-white text-chamGreen px-8 py-3 rounded-2xl text-xl font-bold shadow-lg hover:bg-chamGreen/20"
              onClick={resetAll}
            >Neues Turnier starten</button>
          </motion.div>
        </AnimatePresence>
      )}

        </div>
        <Overview
          rounds={rounds}
          bronzeMatch={bronzeMatch}
          finalMatch={finalMatch}
          winners={winners}
        />
      </div>

      <footer className="mt-10 text-chamGreen/60 text-sm">
        &copy; {new Date().getFullYear()} Chamäleon Tischtennis Turnier App
      </footer>
    </div>
  );
}
