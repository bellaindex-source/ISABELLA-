import './index.css';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';

// --- Error Boundary ---
function renderError(message: string) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div class="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
        <div class="text-6xl mb-4">⚠️</div>
        <h1 class="text-2xl font-black text-red-600 mb-2">Ops! Algo deu errado.</h1>
        <p class="text-red-500 mb-6 max-w-sm">${message}</p>
        <button onclick="window.location.reload()" class="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform">
          Tentar Novamente
        </button>
      </div>
    `;
  }
}

window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  renderError(event.message || 'Ocorreu um erro inesperado.');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  renderError(event.reason?.message || 'Ocorreu um erro de conexão.');
});

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
      renderError("Não foi possível conectar ao banco de dados. Verifique sua conexão com a internet ou a configuração do sistema.");
    }
  }
}
testConnection();

// --- Data Structures ---

interface Challenge {
  id: number;
  mission: number;
  type: string;
  question: string;
  options: string[];
  answer: string;
  feedback: string;
  text?: string;
  targetWords?: string[];
  lessonId?: number;
  isBonus?: boolean;
  pattern?: string;
}

const CHALLENGES: Challenge[] = [
  // Missão 1: Caçadores de Sílabas
  { id: 1, mission: 1, type: 'syllable', question: 'Quantas sílabas tem a palavra BONECA?', options: ['2', '3', '4'], answer: '3', feedback: 'BO-NE-CA tem 3 pedacinhos!' },
  { id: 2, mission: 1, type: 'syllable', question: 'Qual é a primeira sílaba de GATO?', options: ['GA', 'GO', 'TA'], answer: 'GA', feedback: 'GATO começa com GA!' },
  { id: 3, mission: 1, type: 'syllable', question: 'Qual palavra termina com a mesma sílaba de BOLA?', options: ['BOLO', 'MALA', 'BALA'], answer: 'MALA', feedback: 'BO-LA e MA-LA terminam com LA!' },
  { id: 4, mission: 1, type: 'syllable', question: 'Juntando BA + NA + NA, formamos:', options: ['BANANA', 'CABANA', 'BACANA'], answer: 'BANANA', feedback: 'Isso mesmo! Formamos uma fruta!' },
  { id: 5, mission: 1, type: 'syllable', question: 'Qual é a sílaba do meio de CAVALO?', options: ['CA', 'VA', 'LO'], answer: 'VA', feedback: 'CA-VA-LO, o VA está no meio!' },

  // Missão 2: Detetives dos Sons
  { id: 6, mission: 2, type: 'sound', pattern: 'RR', question: 'Qual tem o som mais forte?', options: ['CARO', 'CARRO'], answer: 'CARRO', feedback: 'O RR no meio da palavra tem som forte e vibrante!' },
  { id: 7, mission: 2, type: 'sound', question: 'Qual tem som de /s/?', options: ['DOCE', 'DOZE'], answer: 'DOCE', feedback: 'O C em DOCE tem som de S, enquanto em DOZE tem som de Z!' },
  { id: 8, mission: 2, type: 'sound', pattern: 'S_VOGAL', question: 'Qual tem som de /z/?', options: ['CASA', 'MASSA'], answer: 'CASA', feedback: 'O S entre duas vogais (A-S-A) ganha som de Z!' },
  { id: 9, mission: 2, type: 'sound', pattern: 'NH', question: 'Onde o som nasal do NH aparece?', options: ['NINHO', 'NILO'], answer: 'NINHO', feedback: 'NINHO usa o NH para fazer esse som especial!' },
  { id: 10, mission: 2, type: 'sound', pattern: 'GU', question: 'Qual começa com som de GU (como em foguete)?', options: ['GUERRA', 'GERA'], answer: 'GUERRA', feedback: 'GUE faz o som de GU, enquanto GE faz som de J!' },

  // Missão 3: Palavra Intrusa
  { id: 11, mission: 3, type: 'intruder', pattern: 'CH', question: 'Qual é a palavra intrusa?', options: ['CHUVA', 'CHAVE', 'CHÃO', 'CASA'], answer: 'CASA', feedback: 'CASA não começa com CH como as outras três!' },
  { id: 12, mission: 3, type: 'intruder', pattern: 'NH', question: 'Qual é a palavra intrusa?', options: ['NINHO', 'BANHO', 'MILHO', 'SAPO'], answer: 'SAPO', feedback: 'SAPO não termina com os sons NHO ou LHO!' },
  { id: 13, mission: 3, type: 'intruder', pattern: 'RR', question: 'Qual é a palavra intrusa?', options: ['CARRO', 'TERRA', 'MASSA', 'MALA'], answer: 'MALA', feedback: 'MALA é a única que não tem letras dobradas (RR ou SS)!' },
  { id: 14, mission: 3, type: 'intruder', pattern: 'QU', question: 'Qual é a palavra intrusa?', options: ['QUEIJO', 'QUEDA', 'QUINTO', 'CASA'], answer: 'CASA', feedback: 'CASA começa com C, as outras começam com QU!' },
  { id: 15, mission: 3, type: 'intruder', question: 'Qual é a palavra intrusa?', options: ['GATO', 'RATO', 'PATO', 'PRATO'], answer: 'PRATO', feedback: 'PRATO tem um encontro de duas consoantes (PR) no início!' },

  // Missão 4: Leitores Mestres (10 Lições)
  // Lição 1
  { id: 16, mission: 4, lessonId: 1, type: 'reading', pattern: 'CH', text: 'O gato Juju achou uma chave no chão. Começou uma chuva fina e ele correu para casa.', targetWords: ['chave', 'chão', 'chuva'], question: 'O que o gato achou?', options: ['chave', 'queijo', 'ninho'], answer: 'chave', feedback: 'Ele achou uma chave!' },
  { id: 17, mission: 4, lessonId: 1, type: 'reading', pattern: 'CH', text: 'O gato Juju achou uma chave no chão. Começou uma chuva fina e ele correu para casa.', targetWords: ['chave', 'chão', 'chuva'], question: 'Qual palavra tem CH?', options: ['chave', 'casa', 'massa'], answer: 'chave', feedback: 'Chave começa com CH!' },
  { id: 18, mission: 4, lessonId: 1, type: 'reading', pattern: 'CH', isBonus: true, text: 'O gato Juju achou uma chave no chão. Começou uma chuva fina e ele correu para casa.', targetWords: ['chave', 'chão', 'chuva'], question: 'BÔNUS: “chave” e “chuva” começam com o mesmo som?', options: ['sim', 'não'], answer: 'sim', feedback: 'Sim! Ambas começam com CH!' },
  // Lição 2
  { id: 19, mission: 4, lessonId: 2, type: 'reading', pattern: 'LH', text: 'A Ana viu um grão de milho perto da janela. Ela sorriu e guardou o milho na sacola.', targetWords: ['milho'], question: 'O que a Ana viu?', options: ['milho', 'carro', 'prato'], answer: 'milho', feedback: 'Ela viu um grão de milho!' },
  { id: 20, mission: 4, lessonId: 2, type: 'reading', pattern: 'LH', text: 'A Ana viu um grão de milho perto da janela. Ela sorriu e guardou o milho na sacola.', targetWords: ['milho'], question: 'MILHO tem qual dígrafo?', options: ['NH', 'LH', 'CH'], answer: 'LH', feedback: 'Milho tem LH!' },
  { id: 21, mission: 4, lessonId: 2, type: 'reading', pattern: 'LH', isBonus: true, text: 'A Ana viu um grão de milho perto da janela. Ela sorriu e guardou o milho na sacola.', targetWords: ['milho'], question: 'BÔNUS: Diga outra palavra com LH:', options: ['filha', 'chuva', 'guerra'], answer: 'filha', feedback: 'Filha também tem LH!' },
  // Lição 3
  { id: 22, mission: 4, lessonId: 3, type: 'reading', pattern: 'NH', text: 'O passarinho voltou para o ninho depois do banho. Ele cantou bem alto.', targetWords: ['passarinho', 'ninho', 'banho'], question: 'Para onde ele voltou?', options: ['ninho', 'banco', 'queijo'], answer: 'ninho', feedback: 'Ele voltou para o ninho!' },
  { id: 23, mission: 4, lessonId: 3, type: 'reading', pattern: 'NH', text: 'O passarinho voltou para o ninho depois do banho. Ele cantou bem alto.', targetWords: ['passarinho', 'ninho', 'banho'], question: 'Qual tem NH?', options: ['ninho', 'milho', 'chave'], answer: 'ninho', feedback: 'Ninho tem NH!' },
  { id: 24, mission: 4, lessonId: 3, type: 'reading', pattern: 'NH', isBonus: true, text: 'O passarinho voltou para o ninho depois do banho. Ele cantou bem alto.', targetWords: ['passarinho', 'ninho', 'banho'], question: 'BÔNUS: “banho” tem quantas sílabas?', options: ['2', '3', '4'], answer: '2', feedback: 'BA-NHO tem 2 sílabas!' },
  // Lição 4
  { id: 25, mission: 4, lessonId: 4, type: 'reading', pattern: 'RR', text: 'O carro passou na estrada de terra. Fez poeira e deixou marcas.', targetWords: ['carro', 'terra'], question: 'Onde o carro passou?', options: ['na terra', 'no ninho', 'na chuva'], answer: 'na terra', feedback: 'Ele passou na terra!' },
  { id: 26, mission: 4, lessonId: 4, type: 'reading', pattern: 'RR', text: 'O carro passou na estrada de terra. Fez poeira e deixou marcas.', targetWords: ['carro', 'terra'], question: 'CARRO tem...', options: ['RR', 'SS', 'NH'], answer: 'RR', feedback: 'Carro tem RR!' },
  { id: 27, mission: 4, lessonId: 4, type: 'reading', pattern: 'RR', isBonus: true, text: 'O carro passou na estrada de terra. Fez poeira e deixou marcas.', targetWords: ['carro', 'terra'], question: 'BÔNUS: CARO e CARRO são iguais?', options: ['sim', 'não'], answer: 'não', feedback: 'Não! Mudam o som e o sentido!' },
  // Lição 5
  { id: 28, mission: 4, lessonId: 5, type: 'reading', pattern: 'SS', text: 'A vovó fez massa para o almoço. A massa ficou cheirosa e gostosa.', targetWords: ['massa'], question: 'O que a vovó fez?', options: ['massa', 'milho', 'chave'], answer: 'massa', feedback: 'Ela fez massa!' },
  { id: 29, mission: 4, lessonId: 5, type: 'reading', pattern: 'SS', text: 'A vovó fez massa para o almoço. A massa ficou cheirosa e gostosa.', targetWords: ['massa'], question: 'MASSA tem...', options: ['SS', 'RR', 'CH'], answer: 'SS', feedback: 'Massa tem SS!' },
  { id: 30, mission: 4, lessonId: 5, type: 'reading', pattern: 'SS', isBonus: true, text: 'A vovó fez massa para o almoço. A massa ficou cheirosa e gostosa.', targetWords: ['massa'], question: 'BÔNUS: CASA tem som de /z/ no meio?', options: ['sim', 'não'], answer: 'sim', feedback: 'Sim! Ca-za!' },
  // Lição 6
  { id: 31, mission: 4, lessonId: 6, type: 'reading', pattern: 'QU', text: 'No quinto andar, havia cheiro de queijo. Era lanche da tarde.', targetWords: ['quinto', 'queijo'], question: 'Onde estava o cheiro?', options: ['quinto andar', 'terra', 'ninho'], answer: 'quinto andar', feedback: 'Estava no quinto andar!' },
  { id: 32, mission: 4, lessonId: 6, type: 'reading', pattern: 'QU', text: 'No quinto andar, havia cheiro de queijo. Era lanche da tarde.', targetWords: ['quinto', 'queijo'], question: 'QUEIJO começa com...', options: ['QU', 'GU', 'CH'], answer: 'QU', feedback: 'Queijo começa com QU!' },
  { id: 33, mission: 4, lessonId: 6, type: 'reading', pattern: 'QU', isBonus: true, text: 'No quinto andar, havia cheiro de queijo. Era lanche da tarde.', targetWords: ['quinto', 'queijo'], question: 'BÔNUS: QUE e QUI fazem som de “KE/KI”?', options: ['sim', 'não'], answer: 'sim', feedback: 'Sim, fazem som de K!' },
  // Lição 7
  { id: 34, mission: 4, lessonId: 7, type: 'reading', text: 'O pai recebeu um pacote. O frete foi rápido e chegou cedo.', targetWords: ['frete'], question: 'O que chegou?', options: ['pacote', 'milho', 'carro'], answer: 'pacote', feedback: 'Chegou um pacote!' },
  { id: 35, mission: 4, lessonId: 7, type: 'reading', text: 'O pai recebeu um pacote. O frete foi rápido e chegou cedo.', targetWords: ['frete'], question: 'Qual palavra tem encontro FR?', options: ['frete', 'chave', 'casa'], answer: 'frete', feedback: 'Frete tem FR!' },
  { id: 36, mission: 4, lessonId: 7, type: 'reading', isBonus: true, text: 'O pai recebeu um pacote. O frete foi rápido e chegou cedo.', targetWords: ['frete'], question: 'BÔNUS: Frete tem quantas sílabas?', options: ['1', '2', '3'], answer: '2', feedback: 'FRE-TE tem 2 sílabas!' },
  // Lição 8
  { id: 37, mission: 4, lessonId: 8, type: 'reading', pattern: 'GU', text: 'A palavra guerra começa com GU. Ela não é sobre briga aqui: é só um jogo de sons.', targetWords: ['guerra'], question: 'Qual palavra aparece no texto?', options: ['guerra', 'queijo', 'chuva'], answer: 'guerra', feedback: 'A palavra guerra aparece!' },
  { id: 38, mission: 4, lessonId: 8, type: 'reading', pattern: 'GU', text: 'A palavra guerra começa com GU. Ela não é sobre briga aqui: é só um jogo de sons.', targetWords: ['guerra'], question: 'GUERRA começa com...', options: ['GU', 'QU', 'CH'], answer: 'GU', feedback: 'Guerra começa com GU!' },
  { id: 39, mission: 4, lessonId: 8, type: 'reading', pattern: 'GU', isBonus: true, text: 'A palavra guerra começa com GU. Ela não é sobre briga aqui: é só um jogo de sons.', targetWords: ['guerra'], question: 'BÔNUS: GU e QU têm som parecido às vezes?', options: ['sim', 'não'], answer: 'sim', feedback: 'Sim, dependendo da vogal!' },
  // Lição 9
  { id: 40, mission: 4, lessonId: 9, type: 'reading', text: 'O banco estava vazio. A Ana riu: “Que banco é esse?”', targetWords: ['banco'], question: 'O banco pode ser de quê?', options: ['sentar', 'dinheiro', 'ambos'], answer: 'ambos', feedback: 'Pode ser os dois!' },
  { id: 41, mission: 4, lessonId: 9, type: 'reading', text: 'O banco estava vazio. A Ana riu: “Que banco é esse?”', targetWords: ['banco'], question: 'Por que a Ana riu?', options: ['porque tem dois sentidos', 'porque choveu', 'porque viu milho'], answer: 'porque tem dois sentidos', feedback: 'Porque a palavra tem dois sentidos!' },
  { id: 42, mission: 4, lessonId: 9, type: 'reading', isBonus: true, text: 'O banco estava vazio. A Ana riu: “Que banco é esse?”', targetWords: ['banco'], question: 'BÔNUS: “manga” pode ser duas coisas?', options: ['sim', 'não'], answer: 'sim', feedback: 'Sim! Fruta ou camisa!' },
  // Lição 10
  { id: 43, mission: 4, lessonId: 10, type: 'reading', text: 'A chave caiu perto do carro. A chuva começou e a Ana correu. No fim, ela achou o queijo na mochila.', targetWords: ['chave', 'carro', 'chuva', 'queijo', 'mochila'], question: 'O que começou?', options: ['chuva', 'guerra', 'banho'], answer: 'chuva', feedback: 'A chuva começou!' },
  { id: 44, mission: 4, lessonId: 10, type: 'reading', pattern: 'RR', text: 'A chave caiu perto do carro. A chuva começou e a Ana correu. No fim, ela achou o queijo na mochila.', targetWords: ['chave', 'carro', 'chuva', 'queijo', 'mochila'], question: 'Qual palavra tem RR?', options: ['carro', 'chave', 'queijo'], answer: 'carro', feedback: 'Carro tem RR!' },
  { id: 45, mission: 4, lessonId: 10, type: 'reading', pattern: 'CH', isBonus: true, text: 'A chave caiu perto do carro. A chuva começou e a Ana correu. No fim, ela achou o queijo na mochila.', targetWords: ['chave', 'carro', 'chuva', 'queijo', 'mochila'], question: 'BÔNUS: Encontre 2 palavras com CH:', options: ['chave/chuva', 'carro/queijo', 'ana/fim'], answer: 'chave/chuva', feedback: 'Chave e chuva!' },

  // Missão Secreta: Enigmas
  { id: 46, mission: 5, type: 'enigma', pattern: 'CH', question: 'Sou uma palavra com CH, tenho 5 letras e abro portas.', options: ['CHAVE', 'CHÃO', 'CHUVA'], answer: 'CHAVE', feedback: 'CHAVE abre portas e começa com CH!' },
  { id: 47, mission: 5, type: 'enigma', pattern: 'LH', question: 'Sou uma palavra com LH, moro na fazenda e sou amarela.', options: ['MILHO', 'FOLHA', 'ALHO'], answer: 'MILHO', feedback: 'O milho é amarelo, delicioso e tem LH!' },
  { id: 48, mission: 5, type: 'enigma', pattern: 'QU', question: 'Começo com QU, tenho 6 letras e sou uma comida.', options: ['QUEIJO', 'QUEDA', 'QUILO'], answer: 'QUEIJO', feedback: 'Q-U-E-I-J-O tem 6 letras!' },
  { id: 49, mission: 5, type: 'enigma', pattern: 'RR', question: 'Tenho RR no meio e ando na estrada.', options: ['CARRO', 'CORDA', 'CARTA'], answer: 'CARRO', feedback: 'O carro usa o RR para ter esse som forte!' },
  { id: 50, mission: 5, type: 'enigma', pattern: 'SS', question: 'Tenho SS e é algo que você come.', options: ['MASSA', 'NOSSO', 'PASSO'], answer: 'MASSA', feedback: 'Massa (macarrão) se escreve com SS!' },
];

const MISSIONS = [
  { id: 1, name: 'Caçadores de Sílabas', icon: '🧩', color: 'bg-orange-400' },
  { id: 2, name: 'Detetives dos Sons', icon: '🔍', color: 'bg-blue-400' },
  { id: 3, name: 'Palavra Intrusa', icon: '🚫', color: 'bg-emerald-400' },
  { id: 4, name: 'Leitores Mestres', icon: '📚', color: 'bg-purple-400' },
  { id: 5, name: 'Missão Secreta', icon: '🤫', color: 'bg-gray-800', secret: true },
];

const PEDAGOGICAL_DATA: Record<string, { title: string, explanation: string, sound: string, clue: string }> = {
  'CH': { 
    title: 'CH', 
    explanation: 'Você ouviu? O CH faz um som de sopro, como o barulho da chuva!', 
    sound: 'ch',
    clue: 'Escute bem... esse som parece um sopro suave.'
  },
  'LH': { 
    title: 'LH', 
    explanation: 'Ouviu como o som fica "molhado"? O LH faz a língua dançar!', 
    sound: 'lh',
    clue: 'Tente sentir a língua encostando no céu da boca.'
  },
  'NH': { 
    title: 'NH', 
    explanation: 'Sentiu um tremidinho no nariz? Esse é o som especial do NH!', 
    sound: 'nh',
    clue: 'Esse som sai um pouquinho pelo nariz, percebeu?'
  },
  'RR': { 
    title: 'RR', 
    explanation: 'Que som forte! Parece um motorzinho vibrando na garganta!', 
    sound: 'rr',
    clue: 'É um som bem forte, que faz a garganta vibrar.'
  },
  'SS': { 
    title: 'SS', 
    explanation: 'Ouviu como o som do S ficou limpinho e forte entre as vogais?', 
    sound: 'ss',
    clue: 'Procure o som de S que não muda de lugar.'
  },
  'S_VOGAL': { 
    title: 'S/Z', 
    explanation: 'Percebeu? O S ficou com som de Z porque está descansando entre vogais!', 
    sound: 'z',
    clue: 'Cuidado! Às vezes o S gosta de imitar o som do Z.'
  },
  'QU': { 
    title: 'QU', 
    explanation: 'Viu como o Q e o U estão sempre de mãos dadas para fazer esse som?', 
    sound: 'qu',
    clue: 'O Q nunca está sozinho, ele sempre traz um amigo.'
  },
  'GU': { 
    title: 'GU', 
    explanation: 'Ouviu o som de /g/? O U ajudou o G a ficar com esse som antes do E ou I!', 
    sound: 'gu',
    clue: 'O U está ali para ajudar o G a fazer o som certo.'
  },
};

// --- State Management ---

let state = {
  stars: 0,
  completedChallenges: [] as number[],
  activeView: 'login' as 'login' | 'map' | 'challenge' | 'feedback' | 'notebook' | 'parent_gate' | 'parent_panel',
  currentMissionId: 1,
  currentChallengeIndex: 0,
  lastFeedback: { correct: false, text: '' },
  voiceMode: 'normal' as 'normal' | 'infantil',
  guidedMode: false,
  currentSentenceIndex: -1,
  discoveredPatterns: [] as string[],
  lastUnlockedMissions: [1] as number[],
  performanceScore: 5, // Starts at middle
  patternErrors: {} as Record<string, number>,
  reviewPattern: null as string | null,
  difficultyLevel: 1, // 1: Base, 2: Intermediário, 3: Avançado
  streak: 0,
  lastAnswerTime: 0,
  patternStats: {} as Record<string, { correct: number, total: number }>,
};

let isAuthReady = false;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Load state

const saved = localStorage.getItem('missao_alfa_state');
if (saved) {
  const parsed = JSON.parse(saved);
  if (parsed.activeView !== 'login') {
    state = { ...state, ...parsed };
  }
}

async function saveState() {
  localStorage.setItem('missao_alfa_state', JSON.stringify(state));
  
  if (auth.currentUser) {
    try {
      const stateToSave = { ...state };
      // Don't save transient views to cloud
      if (['challenge', 'feedback', 'parent_gate', 'parent_panel'].includes(stateToSave.activeView)) {
        stateToSave.activeView = 'map';
      }
      await setDoc(doc(db, 'users', auth.currentUser.uid), stateToSave);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}`);
    }
  }
}

onAuthStateChanged(auth, async (user) => {
  isAuthReady = true;
  if (user) {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const cloudState = docSnap.data() as typeof state;
        state = { ...state, ...cloudState, activeView: 'map' };
      } else {
        state.activeView = 'map';
        await saveState();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    }
  } else {
    state.activeView = 'login';
  }
  render();
});

function speak(text: string, isSyllabic: boolean = false) {
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance();
  utterance.lang = 'pt-BR';
  
  if (state.voiceMode === 'infantil') {
    utterance.rate = 0.75;
    utterance.pitch = 1.2;
    
    // If it's a syllabic context in infantil mode, we can add a slight pause
    // by processing the text if it's a word. For simple implementation,
    // we just use the slower rate which already helps.
    // If we want explicit pauses, we'd need to speak parts separately.
    if (isSyllabic) {
      // Simple trick: add spaces or commas to slow down the engine further
      utterance.text = text.split('').join(' '); 
    } else {
      utterance.text = text;
    }
  } else {
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.text = text;
  }
  
  window.speechSynthesis.speak(utterance);
}

function getLevel() {
  if (state.stars >= 56) return 'Guardião';
  if (state.stars >= 36) return 'Mestre';
  if (state.stars >= 16) return 'Explorador';
  return 'Aprendiz';
}

// --- Rendering Logic ---

const app = document.getElementById('app')!;

function renderNotebook(container: HTMLElement) {
  const header = document.createElement('div');
  header.className = 'flex justify-between items-center mb-6';
  header.innerHTML = `
    <button id="back-to-map" class="text-gray-400 font-bold">← Voltar</button>
    <h2 class="text-xl font-black uppercase tracking-tight">📓 Caderno</h2>
  `;
  container.appendChild(header);
  
  const backBtn = header.querySelector('#back-to-map') as HTMLElement;
  if (backBtn) {
    backBtn.onclick = () => {
      state.activeView = 'map';
      render();
    };
  }

  if (state.discoveredPatterns.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-center py-20 space-y-4';
    empty.innerHTML = `
      <div class="text-6xl opacity-20">🔍</div>
      <p class="text-gray-400 font-medium">Você ainda não fez nenhuma descoberta. Continue jogando para preencher seu caderno!</p>
    `;
    container.appendChild(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'space-y-4';

    state.discoveredPatterns.forEach(pattern => {
      const data = PEDAGOGICAL_DATA[pattern];
      if (!data) return;

      const item = document.createElement('div');
      item.className = 'bg-white p-6 rounded-3xl shadow-md border border-black/5 space-y-3 animate-in fade-in slide-in-from-bottom-2';
      item.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl font-black">
            ${pattern}
          </div>
          <button class="listen-notebook-sound bg-indigo-50 text-indigo-600 p-3 rounded-xl hover:bg-indigo-100 transition-colors">
            🔊
          </button>
        </div>
        <h4 class="text-lg font-bold text-gray-800">${data.title}</h4>
        <p class="text-sm text-gray-600 leading-relaxed">${data.explanation}</p>
      `;
      
      (item.querySelector('.listen-notebook-sound') as HTMLElement).onclick = () => speak(data.sound);
      grid.appendChild(item);
    });

    container.appendChild(grid);
  }
}

function renderParentGate(container: HTMLElement) {
  const card = document.createElement('div');
  card.className = 'bg-white p-8 rounded-3xl shadow-xl text-center space-y-6 animate-in zoom-in duration-300';
  
  card.innerHTML = `
    <div class="text-4xl">🔐</div>
    <h2 class="text-xl font-black uppercase">Acesso Restrito</h2>
    <p class="text-gray-500 text-sm">Para entrar no Painel da Mãe, peça ajuda a um adulto.</p>
    <div class="flex justify-center gap-2" id="pin-input-container">
      <input type="password" maxlength="4" class="w-32 text-center text-2xl font-black tracking-[1em] border-b-4 border-indigo-600 focus:outline-none" id="parent-pin" autofocus>
    </div>
    <div class="flex flex-col gap-2">
      <button id="verify-pin" class="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform">Entrar</button>
      <button id="cancel-gate" class="w-full text-gray-400 font-bold py-2">Voltar</button>
    </div>
  `;
  
  container.appendChild(card);
  
  const input = card.querySelector('#parent-pin') as HTMLInputElement;
  const verifyBtn = card.querySelector('#verify-pin') as HTMLElement;
  const cancelBtn = card.querySelector('#cancel-gate') as HTMLElement;
  
  const verify = () => {
    if (input.value === '1234') { // Simple default pin
      state.activeView = 'parent_panel';
    } else {
      alert('PIN incorreto!');
      input.value = '';
    }
    render();
  };

  verifyBtn.onclick = verify;
  cancelBtn.onclick = () => {
    state.activeView = 'map';
    render();
  };
  input.onkeyup = (e) => { if (e.key === 'Enter') verify(); };
}

function renderParentPanel(container: HTMLElement) {
  const header = document.createElement('div');
  header.className = 'flex justify-between items-center mb-6';
  header.innerHTML = `
    <button id="exit-panel" class="text-gray-400 font-bold">← Sair</button>
    <h2 class="text-xl font-black uppercase tracking-tight">👩 Painel da Mãe</h2>
  `;
  container.appendChild(header);
  (header.querySelector('#exit-panel') as HTMLElement).onclick = () => {
    state.activeView = 'map';
    render();
  };

  const statsGrid = document.createElement('div');
  statsGrid.className = 'grid grid-cols-2 gap-4 mb-8';
  
  const completedMissions = state.lastUnlockedMissions.length;
  const avgLevel = state.difficultyLevel === 1 ? 'Base' : state.difficultyLevel === 2 ? 'Intermediário' : 'Avançado';

  statsGrid.innerHTML = `
    <div class="bg-white p-4 rounded-2xl shadow-sm border border-black/5">
      <div class="text-[10px] uppercase font-bold text-gray-400">Estrelas</div>
      <div class="text-2xl font-black text-yellow-500">${state.stars}</div>
    </div>
    <div class="bg-white p-4 rounded-2xl shadow-sm border border-black/5">
      <div class="text-[10px] uppercase font-bold text-gray-400">Missões</div>
      <div class="text-2xl font-black text-indigo-600">${completedMissions}</div>
    </div>
    <div class="bg-white p-4 rounded-2xl shadow-sm border border-black/5">
      <div class="text-[10px] uppercase font-bold text-gray-400">Descobertas</div>
      <div class="text-2xl font-black text-emerald-600">${state.discoveredPatterns.length}</div>
    </div>
    <div class="bg-white p-4 rounded-2xl shadow-sm border border-black/5">
      <div class="text-[10px] uppercase font-bold text-gray-400">Nível Atual</div>
      <div class="text-lg font-black text-gray-800">${avgLevel}</div>
    </div>
  `;
  container.appendChild(statsGrid);

  // Analysis
  const analysisBox = document.createElement('div');
  analysisBox.className = 'bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-8';
  
  let analysisText = "Seu filho está começando a jornada agora! Continue incentivando a exploração das primeiras missões.";
  if (state.stars > 50) analysisText = "Ótimo progresso! A criança demonstra segurança com sílabas simples e está começando a dominar sons mais complexos.";
  if (state.stars > 150) analysisText = "Excelente! Já possui um vocabulário amplo e consegue ler frases completas com fluidez.";
  
  analysisBox.innerHTML = `
    <h3 class="font-black text-indigo-900 mb-2">Análise do Progresso</h3>
    <p class="text-sm text-indigo-700 leading-relaxed">${analysisText}</p>
  `;
  container.appendChild(analysisBox);

  // Pattern Map
  const patternTitle = document.createElement('h3');
  patternTitle.className = 'font-black uppercase tracking-widest text-xs text-gray-400 mb-4';
  patternTitle.innerText = 'Mapa de Conhecimento';
  container.appendChild(patternTitle);

  const patternGrid = document.createElement('div');
  patternGrid.className = 'space-y-3';

  Object.keys(PEDAGOGICAL_DATA).forEach(key => {
    const stats = state.patternStats[key] || { correct: 0, total: 0 };
    const rate = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    
    let statusColor = 'bg-gray-100';
    let statusText = 'Não iniciado';
    let dotColor = 'bg-gray-300';

    if (stats.total > 0) {
      if (rate > 85) {
        statusColor = 'bg-green-50';
        statusText = 'Dominado';
        dotColor = 'bg-green-500';
      } else if (rate >= 60) {
        statusColor = 'bg-yellow-50';
        statusText = 'Em desenvolvimento';
        dotColor = 'bg-yellow-500';
      } else {
        statusColor = 'bg-red-50';
        statusText = 'Precisa reforço';
        dotColor = 'bg-red-500';
      }
    }

    const item = document.createElement('div');
    item.className = `${statusColor} p-4 rounded-2xl flex items-center justify-between border border-black/5`;
    item.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-gray-700 shadow-sm">${key}</div>
        <div>
          <div class="text-sm font-bold text-gray-800">${PEDAGOGICAL_DATA[key].title}</div>
          <div class="text-[10px] font-bold uppercase tracking-widest opacity-50">${statusText}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="text-xs font-black text-gray-400">${stats.correct}/${stats.total}</div>
        <div class="w-2 h-2 rounded-full ${dotColor}"></div>
      </div>
    `;
    patternGrid.appendChild(item);
  });

  container.appendChild(patternGrid);
}

function renderLogin(container: HTMLElement) {
  const card = document.createElement('div');
  card.className = 'bg-white p-8 rounded-3xl shadow-xl text-center space-y-6 animate-in zoom-in duration-300 max-w-sm mx-auto mt-20';
  
  card.innerHTML = `
    <div class="text-6xl mb-4">🚀</div>
    <h1 class="text-2xl font-black uppercase tracking-tight text-indigo-600">Missão Alfabetização</h1>
    <p class="text-gray-500 text-sm font-medium">Faça login para salvar seu progresso nas estrelas!</p>
    
    <button id="login-btn" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3 mt-8">
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Entrar com Google
    </button>
  `;

  container.appendChild(card);

  const loginBtn = card.querySelector('#login-btn') as HTMLElement;
  loginBtn.onclick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Erro ao fazer login. Tente novamente.');
    }
  };
}

function render() {
  app.innerHTML = '';
  
  if (!isAuthReady) {
    const loading = document.createElement('div');
    loading.className = 'flex items-center justify-center h-screen text-indigo-600 font-bold animate-pulse';
    loading.innerText = 'Carregando...';
    app.appendChild(loading);
    return;
  }

  if (state.activeView === 'login') {
    renderLogin(app);
    return;
  }

  // Header
  const header = document.createElement('header');
  header.className = 'bg-white border-b border-black/5 p-4 sticky top-0 z-50 flex justify-between items-center shadow-sm';
  header.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center shadow-sm">
        <span class="text-xl">🌟</span>
      </div>
      <div>
        <h1 class="text-lg font-bold leading-none">Missão Alfabetização</h1>
        <span class="text-[10px] uppercase tracking-widest font-bold text-gray-400">${getLevel()}</span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-2 bg-yellow-100 px-3 py-1.5 rounded-full border border-yellow-200">
        <span class="text-yellow-600 font-bold">⭐ ${state.stars}</span>
      </div>
      <button id="logout-btn" class="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-gray-200 transition-colors">Sair</button>
    </div>
  `;
  app.appendChild(header);

  const logoutBtn = header.querySelector('#logout-btn') as HTMLElement;
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await signOut(auth);
    };
  }

  const main = document.createElement('main');
  main.className = 'max-w-md mx-auto p-6 pb-24';
  
  if (state.activeView === 'map') {
    renderMap(main);
  } else if (state.activeView === 'challenge') {
    renderChallenge(main);
  } else if (state.activeView === 'feedback') {
    renderFeedback(main);
  } else if (state.activeView === 'notebook') {
    renderNotebook(main);
  } else if (state.activeView === 'parent_gate') {
    renderParentGate(main);
  } else if (state.activeView === 'parent_panel') {
    renderParentPanel(main);
  }

  app.appendChild(main);
}

function isMissionUnlocked(missionId: number): boolean {
  if (missionId === 1) return true;
  
  if (missionId === 2) {
    return state.stars >= 15;
  }
  
  if (missionId === 3) {
    // Unlocks after completing discoveries of Mission 2
    const mission2Patterns = CHALLENGES.filter(c => c.mission === 2 && c.pattern).map(c => c.pattern!);
    return state.discoveredPatterns.some(p => mission2Patterns.includes(p));
  }
  
  if (missionId === 4) {
    // Unlocks after 20 stars in Mission 3 (4 challenges)
    const mission3Completed = state.completedChallenges.filter(id => {
      const c = CHALLENGES.find(ch => ch.id === id);
      return c && c.mission === 3;
    }).length;
    return mission3Completed >= 4;
  }
  
  if (missionId === 5) {
    // Secret Mission: 100 stars and 5 discoveries
    return state.stars >= 100 && state.discoveredPatterns.length >= 5;
  }
  
  return false;
}

function checkUnlocks() {
  const newlyUnlocked: number[] = [];
  MISSIONS.forEach(m => {
    if (isMissionUnlocked(m.id) && !state.lastUnlockedMissions.includes(m.id)) {
      newlyUnlocked.push(m.id);
    }
  });

  if (newlyUnlocked.length > 0) {
    state.lastUnlockedMissions.push(...newlyUnlocked);
    saveState();
    
    newlyUnlocked.forEach(id => {
      const mission = MISSIONS.find(m => m.id === id);
      if (mission) showUnlockNotification(mission.name);
    });
  }
}

function showUnlockNotification(missionName: string) {
  const toast = document.createElement('div');
  toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-yellow-400 text-white px-6 py-3 rounded-full font-black shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-10 duration-500';
  toast.innerHTML = `
    <span class="text-2xl">🔓</span>
    <span>Nova missão liberada: ${missionName}!</span>
  `;
  document.body.appendChild(toast);
  
  speak(`Nova missão liberada: ${missionName}`);
  confettiEffect();

  setTimeout(() => {
    toast.classList.add('animate-out', 'fade-out', 'slide-out-to-top-10');
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

function renderMap(container: HTMLElement) {
  checkUnlocks();
  
  // Notebook Button
  const notebookBtn = document.createElement('button');
  notebookBtn.className = 'w-full bg-indigo-600 text-white p-4 rounded-2xl shadow-lg mb-6 flex items-center justify-center gap-3 font-black uppercase tracking-widest active:scale-95 transition-transform';
  notebookBtn.innerHTML = `
    <span class="text-2xl">📓</span>
    <span>Caderno do Explorador</span>
    <span class="bg-indigo-400 text-[10px] px-2 py-0.5 rounded-full">${state.discoveredPatterns.length}</span>
  `;
  notebookBtn.onclick = () => {
    state.activeView = 'notebook';
    render();
  };
  container.appendChild(notebookBtn);

  // Voice Mode Selector
  const voiceBox = document.createElement('div');
  voiceBox.className = 'bg-white p-4 rounded-2xl shadow-sm border border-black/5 mb-6 flex flex-col gap-3';
  
  const voiceHeader = document.createElement('div');
  voiceHeader.className = 'flex items-center gap-2 font-bold text-gray-600 text-sm uppercase tracking-wider';
  voiceHeader.innerHTML = '<span>🔊 Modo de Voz:</span>';
  voiceBox.appendChild(voiceHeader);

  const btnContainer = document.createElement('div');
  btnContainer.className = 'flex gap-2';

  const btnInfantil = document.createElement('button');
  btnInfantil.className = `flex-1 py-2 rounded-xl font-bold transition-all ${state.voiceMode === 'infantil' ? 'bg-yellow-400 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`;
  btnInfantil.innerText = '👶 Infantil';
  btnInfantil.onclick = () => {
    state.voiceMode = 'infantil';
    saveState();
    render();
    speak("Modo infantil ativado");
  };

  const btnNormal = document.createElement('button');
  btnNormal.className = `flex-1 py-2 rounded-xl font-bold transition-all ${state.voiceMode === 'normal' ? 'bg-blue-400 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`;
  btnNormal.innerText = '🗣 Normal';
  btnNormal.onclick = () => {
    state.voiceMode = 'normal';
    saveState();
    render();
    speak("Modo normal ativado");
  };

  btnContainer.appendChild(btnInfantil);
  btnContainer.appendChild(btnNormal);
  voiceBox.appendChild(btnContainer);
  container.appendChild(voiceBox);

  const title = document.createElement('h2');
  title.className = 'text-2xl font-black mb-6 text-center uppercase tracking-tight';
  title.innerText = '🌍 Mapa de Missões';
  container.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'space-y-4';

  MISSIONS.forEach((mission) => {
    const unlocked = isMissionUnlocked(mission.id);
    const completedCount = state.completedChallenges.filter(id => {
      const ch = CHALLENGES.find(c => c.id === id);
      return ch && ch.mission === mission.id;
    }).length;
    const totalCount = CHALLENGES.filter(c => c.mission === mission.id).length;
    const isCompleted = completedCount === totalCount && totalCount > 0;

    if (mission.secret && !unlocked) return; // Hide secret until unlocked

    const btn = document.createElement('button');
    btn.className = `w-full p-6 rounded-3xl shadow-lg transition-all flex items-center justify-between group relative overflow-hidden border-2 ${
      unlocked 
        ? mission.color + ' text-white border-black/5 hover:shadow-xl active:scale-95' 
        : 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed border-gray-200'
    }`;
    
    btn.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="bg-white/20 p-3 rounded-2xl text-2xl shadow-inner group-hover:scale-110 transition-transform">
          ${unlocked ? mission.icon : '🔒'}
        </div>
        <div class="text-left">
          <div class="font-black text-xl uppercase tracking-tight">${unlocked ? mission.name : 'Bloqueado'}</div>
          <div class="text-[10px] font-bold uppercase tracking-widest opacity-70">
            ${unlocked ? (isCompleted ? '✅ Concluída!' : `${completedCount}/${totalCount} Desafios`) : 'Continue sua jornada!'}
          </div>
        </div>
      </div>
      ${unlocked && isCompleted ? '<span class="text-2xl">⭐</span>' : unlocked ? '<span class="text-2xl group-hover:translate-x-1 transition-transform">➡️</span>' : ''}
    `;

    if (unlocked) {
      btn.onclick = () => {
        state.currentMissionId = mission.id;
        state.currentChallengeIndex = 0;
        state.activeView = 'challenge';
        render();
      };
    } else {
      btn.onclick = () => {
        speak("Esta missão ainda está bloqueada. Continue jogando para desbloquear!");
      };
    }

    grid.appendChild(btn);
  });

  container.appendChild(grid);

  // Parent Panel Access (Hidden)
  const parentBtn = document.createElement('button');
  parentBtn.className = 'w-full mt-8 text-gray-200 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-indigo-300 transition-colors py-4';
  parentBtn.innerText = 'Área do Responsável';
  parentBtn.onclick = () => {
    state.activeView = 'parent_gate';
    render();
  };
  container.appendChild(parentBtn);

  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.className = 'w-full mt-12 text-gray-300 text-xs font-bold uppercase tracking-widest hover:text-red-400 transition-colors';
  resetBtn.innerText = 'Recomeçar Jornada';
  resetBtn.onclick = () => {
    if (confirm('Deseja zerar seu progresso?')) {
      state = {
        stars: 0,
        completedChallenges: [],
        activeView: 'map',
        currentMissionId: 1,
        currentChallengeIndex: 0,
        lastFeedback: { correct: false, text: '' },
        voiceMode: 'normal',
        guidedMode: false,
        currentSentenceIndex: -1,
        discoveredPatterns: [],
        lastUnlockedMissions: [1],
        performanceScore: 5,
        patternErrors: {},
        reviewPattern: null,
        difficultyLevel: 1,
        streak: 0,
        lastAnswerTime: 0,
        patternStats: {},
      };
      saveState();
      render();
    }
  };
  container.appendChild(resetBtn);
}

function renderChallenge(container: HTMLElement) {
  state.lastAnswerTime = Date.now(); // Start timer for response time
  let missionChallenges = CHALLENGES.filter(c => c.mission === state.currentMissionId);
  
  // Review Logic: If we have a review pattern, prioritize challenges with that pattern
  if (state.reviewPattern) {
    const reviewChallenges = missionChallenges.filter(c => c.pattern === state.reviewPattern && !state.completedChallenges.includes(c.id));
    if (reviewChallenges.length > 0) {
      // Temporarily use the review challenges
      missionChallenges = reviewChallenges;
    } else {
      state.reviewPattern = null; // No more review challenges for this pattern
    }
  }

  const challenge = missionChallenges[state.currentChallengeIndex] || missionChallenges[0];

  if (!challenge) {
    state.activeView = 'map';
    render();
    return;
  }

  const header = document.createElement('div');
  header.className = 'flex justify-between items-center mb-6';
  
  const backBtn = document.createElement('button');
  backBtn.className = 'text-gray-400 font-bold';
  backBtn.innerText = '← Voltar';
  backBtn.onclick = () => {
    state.activeView = 'map';
    render();
  };

  const progressInfo = document.createElement('div');
  progressInfo.className = 'text-sm font-bold text-gray-400';
  
  if (challenge.mission === 4 && challenge.lessonId) {
    progressInfo.innerText = `Lição ${challenge.lessonId} / 10`;
  } else {
    progressInfo.innerText = `Desafio ${state.currentChallengeIndex + 1} / ${missionChallenges.length}`;
  }

  header.appendChild(backBtn);
  header.appendChild(progressInfo);
  container.appendChild(header);

  const card = document.createElement('div');
  card.className = 'bg-white p-6 rounded-3xl shadow-xl border border-black/5 space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500';
  
  // Low Performance Reinforcement: Auto-show explanation if score is very low
  if (state.performanceScore < 2 && challenge.pattern) {
    const hint = document.createElement('div');
    hint.className = 'bg-yellow-50 p-3 rounded-xl border border-yellow-100 text-xs text-yellow-700 font-medium mb-2 animate-pulse';
    hint.innerText = `💡 Dica: ${PEDAGOGICAL_DATA[challenge.pattern].clue}`;
    card.appendChild(hint);
  }

  // Lesson Text Block
  if (challenge.text) {
    const textBlock = document.createElement('div');
    textBlock.className = 'bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-4 relative';
    
    // Guided Mode Toggle
    const guidedToggle = document.createElement('button');
    guidedToggle.className = `absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${state.guidedMode ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-indigo-400 border-indigo-100'}`;
    guidedToggle.innerText = state.guidedMode ? '📖 Modo Guiado: ON' : '📖 Modo Guiado: OFF';
    guidedToggle.onclick = () => {
      state.guidedMode = !state.guidedMode;
      state.currentSentenceIndex = -1;
      render();
    };
    textBlock.appendChild(guidedToggle);

    const textContent = document.createElement('div');
    textContent.className = 'text-lg font-medium leading-relaxed text-indigo-900 text-left';
    
    const sentences = challenge.text.split('. ').map(s => s.endsWith('.') ? s : s + '.');
    
    sentences.forEach((sentence, sIdx) => {
      const span = document.createElement('span');
      span.className = `transition-all duration-300 rounded px-1 ${state.guidedMode && state.currentSentenceIndex === sIdx ? 'bg-yellow-200 text-indigo-950 scale-105 inline-block' : ''}`;
      
      let html = sentence;
      if (challenge.targetWords) {
        challenge.targetWords.forEach(word => {
          const regex = new RegExp(`(${word})`, 'gi');
          html = html.replace(regex, `<span class="target-word text-indigo-600 font-black cursor-pointer underline decoration-indigo-300 underline-offset-4 hover:bg-indigo-200 transition-colors rounded px-0.5">$1</span>`);
        });
      }
      span.innerHTML = html + ' ';
      
      // Target word clicks
      span.querySelectorAll('.target-word').forEach(el => {
        (el as HTMLElement).onclick = (e) => {
          e.stopPropagation();
          const word = (el as HTMLElement).innerText.toUpperCase();
          speak(word);
          
          // Find pattern
          let pattern = '';
          if (word.includes('CH')) pattern = 'CH';
          else if (word.includes('LH')) pattern = 'LH';
          else if (word.includes('NH')) pattern = 'NH';
          else if (word.includes('RR')) pattern = 'RR';
          else if (word.includes('SS')) pattern = 'SS';
          else if (word.includes('QU')) pattern = 'QU';
          else if (word.includes('GU')) pattern = 'GU';
          
          if (pattern) showPedagogicalPopup(pattern);
        };
      });

      textContent.appendChild(span);
    });

    const listenBtn = document.createElement('button');
    listenBtn.className = 'flex items-center justify-center gap-2 w-full bg-indigo-500 text-white py-2 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-transform';
    listenBtn.innerHTML = `<span>🔊 ${state.guidedMode ? 'Iniciar Leitura Guiada' : 'Ouvir Texto Completo'}</span>`;
    
    listenBtn.onclick = async () => {
      if (state.guidedMode) {
        for (let i = 0; i < sentences.length; i++) {
          state.currentSentenceIndex = i;
          render();
          await new Promise(resolve => {
            const utterance = new SpeechSynthesisUtterance(sentences[i]);
            utterance.lang = 'pt-BR';
            utterance.rate = state.voiceMode === 'infantil' ? 0.75 : 1.0;
            utterance.pitch = state.voiceMode === 'infantil' ? 1.2 : 1.0;
            utterance.onend = () => setTimeout(resolve, 500);
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          });
        }
        state.currentSentenceIndex = -1;
        render();
      } else {
        speak(challenge.text!);
      }
    };

    textBlock.appendChild(textContent);
    textBlock.appendChild(listenBtn);
    card.appendChild(textBlock);
  }

  const question = document.createElement('button');
  question.className = 'text-xl font-bold text-gray-800 leading-tight w-full hover:text-yellow-500 transition-colors cursor-pointer flex flex-col items-center gap-2';
  
  if (challenge.isBonus) {
    question.innerHTML = `
      <span class="bg-yellow-400 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest mb-1">Desafio Bônus 🌟</span>
      <span>${challenge.question}</span>
    `;
  } else {
    question.innerHTML = `<span>${challenge.question}</span>`;
  }
  
  question.onclick = () => {
    const isSyllabic = challenge.mission === 1;
    speak(challenge.question, isSyllabic);
  };
  card.appendChild(question);

  const optionsGrid = document.createElement('div');
  optionsGrid.className = 'grid grid-cols-1 gap-3';

  challenge.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'w-full p-4 rounded-2xl border-2 border-gray-100 font-black text-lg hover:border-yellow-400 hover:bg-yellow-50 transition-all active:scale-95';
    btn.innerText = opt;
    btn.onclick = () => {
      speak(opt);
      handleAnswer(opt, challenge);
    };
    optionsGrid.appendChild(btn);
  });

  card.appendChild(optionsGrid);
  container.appendChild(card);
}

function handleAnswer(selected: string, challenge: Challenge) {
  const isCorrect = selected === challenge.answer;
  const now = Date.now();
  const responseTime = now - state.lastAnswerTime;
  
  // Track stats for Parent Panel
  if (challenge.pattern) {
    if (!state.patternStats[challenge.pattern]) {
      state.patternStats[challenge.pattern] = { correct: 0, total: 0 };
    }
    state.patternStats[challenge.pattern].total++;
    if (isCorrect) state.patternStats[challenge.pattern].correct++;
  }

  // Adaptive Difficulty & Scoring
  if (isCorrect) {
    state.performanceScore = Math.min(20, state.performanceScore + 2);
    state.streak = state.streak >= 0 ? state.streak + 1 : 1;
    if (challenge.pattern) state.patternErrors[challenge.pattern] = 0;

    // Level Up Logic
    // 4 correct in a row OR 2 very fast correct (under 3s)
    if (state.streak >= 4 || (responseTime < 3000 && state.streak >= 2)) {
      state.difficultyLevel = Math.min(3, state.difficultyLevel + 1);
      state.streak = 0; // Reset streak after level change
    }
  } else {
    state.performanceScore = Math.max(0, state.performanceScore - 1);
    state.streak = state.streak <= 0 ? state.streak - 1 : -1;
    
    if (challenge.pattern) {
      state.patternErrors[challenge.pattern] = (state.patternErrors[challenge.pattern] || 0) + 1;
      
      // Check for 3 errors on same pattern: Mini Review
      if (state.patternErrors[challenge.pattern] >= 3) {
        showPedagogicalPopup(challenge.pattern);
        state.reviewPattern = challenge.pattern;
        state.patternErrors[challenge.pattern] = 0;
      }
    }

    // Level Down Logic
    // 2 errors in a row OR 1 very slow error (over 15s)
    if (state.streak <= -2 || responseTime > 15000) {
      state.difficultyLevel = Math.max(1, state.difficultyLevel - 1);
      state.streak = 0;
    }
  }

  // Soft clues for errors
  let feedbackText = isCorrect ? 'Incrível! Você acertou!' : 'Ops! Não foi dessa vez.';
  if (!isCorrect && challenge.pattern) {
    const data = PEDAGOGICAL_DATA[challenge.pattern];
    if (data) feedbackText = data.clue;
  }

  state.lastFeedback = {
    correct: isCorrect,
    text: feedbackText,
  };
  
  if (isCorrect) {
    if (!state.completedChallenges.includes(challenge.id)) {
      state.completedChallenges.push(challenge.id);
      state.stars += 5;
    }
    // Success animation trigger
    confettiEffect();
    
    // Voice feedback: Speak the word first if it's a word-based challenge
    if (challenge.type === 'syllable' || challenge.type === 'enigma') {
      speak(challenge.answer, true);
      // Delay the praise slightly so it doesn't overlap too much (though cancel() is used)
      setTimeout(() => {
        const msg = state.voiceMode === 'infantil' ? "Muito bem! Você conseguiu!" : "Correto!";
        speak(msg);
      }, 1000);
    } else {
      const msg = state.voiceMode === 'infantil' ? "Muito bem! Você conseguiu!" : "Correto!";
      speak(msg);
    }

    // Save pattern to notebook
    if (challenge.pattern && !state.discoveredPatterns.includes(challenge.pattern)) {
      state.discoveredPatterns.push(challenge.pattern);
    }
  } else {
    // Voice feedback
    const msg = state.voiceMode === 'infantil' ? "Vamos tentar de novo!" : "Tente novamente.";
    speak(msg);
  }

  state.activeView = 'feedback';
  saveState();
  render();
}

function renderFeedback(container: HTMLElement) {
  const missionChallenges = CHALLENGES.filter(c => c.mission === state.currentMissionId);
  const challenge = missionChallenges[state.currentChallengeIndex];

  const card = document.createElement('div');
  card.className = `p-8 rounded-3xl shadow-2xl text-center space-y-6 animate-in zoom-in duration-300 ${
    state.lastFeedback.correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
  }`;

  const iconDiv = document.createElement('div');
  iconDiv.className = 'text-6xl';
  iconDiv.innerText = state.lastFeedback.correct ? '🎉' : '💡';
  card.appendChild(iconDiv);

  const feedbackTitle = document.createElement('h2');
  feedbackTitle.className = 'text-2xl font-black leading-tight';
  feedbackTitle.innerText = state.lastFeedback.text;
  card.appendChild(feedbackTitle);

  // Fluid Discovery Bubble/Tag
  if (state.lastFeedback.correct && challenge.pattern) {
    const discovery = PEDAGOGICAL_DATA[challenge.pattern];
    if (discovery) {
      const isFirstTime = !state.completedChallenges.some(id => {
        const c = CHALLENGES.find(ch => ch.id === id);
        return c && c.id !== challenge.id && c.pattern === challenge.pattern;
      });

      const bubble = document.createElement('div');
      if (isFirstTime) {
        bubble.className = 'bg-white/20 p-4 rounded-2xl text-sm border border-white/30 animate-in slide-in-from-top-2 duration-500';
        bubble.innerHTML = `
          <div class="flex items-center justify-center gap-2 mb-2">
            <span class="text-xl">🧠</span>
            <span class="font-black uppercase tracking-widest text-[10px]">Descoberta!</span>
          </div>
          <p class="font-medium">${discovery.explanation}</p>
          <button id="listen-pattern-sound" class="mt-3 w-full bg-white/20 py-2 rounded-xl font-bold text-xs hover:bg-white/30 transition-colors">
            🔊 Ouvir som: "${discovery.sound}"
          </button>
        `;
      } else {
        bubble.className = 'inline-block mx-auto';
        bubble.innerHTML = `
          <button id="listen-pattern-sound" class="bg-white/20 px-4 py-2 rounded-full font-black text-xs border border-white/30 hover:bg-white/30 transition-all flex items-center gap-2">
            <span>🔎 ${discovery.title}</span>
            <span class="opacity-60">🔊</span>
          </button>
        `;
      }
      card.appendChild(bubble);
    }
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'w-full bg-white text-gray-800 py-4 rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-transform mt-4';
  nextBtn.innerText = state.lastFeedback.correct ? 'Próximo Desafio' : 'Tentar Novamente';
  
  nextBtn.onclick = () => {
    if (state.lastFeedback.correct) {
      if (state.currentChallengeIndex < missionChallenges.length - 1) {
        state.currentChallengeIndex++;
        state.activeView = 'challenge';
      } else {
        state.activeView = 'map';
      }
    } else {
      state.activeView = 'challenge';
    }
    render();
  };

  const menuBtn = document.createElement('button');
  menuBtn.className = 'w-full text-white/80 font-bold py-2 mt-2 text-sm uppercase tracking-widest hover:text-white transition-colors';
  menuBtn.innerText = 'Voltar ao Mapa';
  menuBtn.onclick = () => {
    state.activeView = 'map';
    render();
  };

  card.appendChild(nextBtn);
  card.appendChild(menuBtn);
  container.appendChild(card);

  // Set listeners for discovery box if it exists
  const listenPatternBtn = card.querySelector('#listen-pattern-sound') as HTMLElement;
  if (listenPatternBtn && challenge.pattern) {
    const discovery = PEDAGOGICAL_DATA[challenge.pattern];
    listenPatternBtn.onclick = (e) => {
      e.stopPropagation();
      speak(discovery.sound);
    };
  }
}

function showPedagogicalPopup(pattern: string) {
  const data = PEDAGOGICAL_DATA[pattern];
  if (!data) return;

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300';
  
  const modal = document.createElement('div');
  modal.className = 'bg-white w-full max-w-xs rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in zoom-in duration-300';
  
  modal.innerHTML = `
    <div class="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-4xl font-black shadow-inner">
      ${pattern}
    </div>
    <div class="space-y-2">
      <h4 class="text-xl font-bold text-gray-800">Dica do Mestre!</h4>
      <p class="text-gray-600 leading-relaxed">${data.explanation}</p>
    </div>
    <div class="flex flex-col gap-3">
      <button id="listen-sound" class="w-full bg-indigo-500 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
        <span>🔊 Ouvir Som</span>
      </button>
      <button id="close-modal" class="w-full bg-gray-100 text-gray-500 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-colors">
        Entendi!
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const listenBtn = modal.querySelector('#listen-sound') as HTMLElement;
  if (listenBtn) listenBtn.onclick = () => speak(data.sound);
  
  const closeBtn = modal.querySelector('#close-modal') as HTMLElement;
  if (closeBtn) closeBtn.onclick = () => overlay.remove();
  
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

function confettiEffect() {
  const colors = ['#FFD700', '#FF4500', '#32CD32', '#1E90FF', '#FF69B4'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'fixed pointer-events-none z-[100] w-2 h-2 rounded-full';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = Math.random() * 100 + 'vw';
    p.style.top = '-10px';
    document.body.appendChild(p);

    const animation = p.animate([
      { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${(Math.random() - 0.5) * 200}px, 100vh) rotate(${Math.random() * 360}deg)`, opacity: 0 }
    ], {
      duration: 1000 + Math.random() * 1000,
      easing: 'cubic-bezier(0, .9, .57, 1)'
    });

    animation.onfinish = () => p.remove();
  }
}

// Initial render
render();
