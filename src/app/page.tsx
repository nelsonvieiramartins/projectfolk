'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ==================== TYPES ====================
interface Position {
  x: number
  y: number
}

interface Monster {
  id: number
  name: string
  category: 'A' | 'B' | 'C'
  position: Position
  health: number
  maxHealth: number
  speed: number
  pathIndex: number
  element: 'fire' | 'water' | 'impact'
  slowTurns: number
  burnTurns: number
  skipNextTrap: boolean
}

interface Card {
  id: number
  type: 'basico' | 'especial' | 'base' | 'essencial' | 'weapon'
  name: string
  quantity: number
  towerKey?: string
  emoji?: string
}

interface Tower {
  id: number
  name: string
  position: Position
  damage: number
  range: number
  cooldown: number
  lastShot: number
  element: 'fire' | 'water' | 'impact'
  disabled: number
}

interface GameState {
  phase: 'menu' | 'morning' | 'afternoon' | 'night' | 'gameover' | 'victory'
  night: number
  relics: number
  coins: number
  monsters: Monster[]
  towers: Tower[]
  hand: Card[]
  monstersKilled: number
  isWaveActive: boolean
  monstersToSpawn: number
  selectedCard: number | null
  message: string
  actionsUsed: number
  maxActions: number
}

// ==================== CONSTANTS ====================
const GRID_WIDTH = 14
const GRID_HEIGHT = 10
const TILE_SIZE = 50
const MAX_HAND_SIZE = 6

// Monster definitions
const MONSTER_TYPES = {
  A: [
    { name: 'Saci', element: 'water' as const, emoji: '🦶' },
    { name: 'Curupira', element: 'impact' as const, emoji: '🌳' },
    { name: 'Caipora', element: 'impact' as const, emoji: '🐗' },
    { name: 'Pisadeira', element: 'fire' as const, emoji: '👵' },
    { name: 'Matinta Perêra', element: 'water' as const, emoji: '🧙‍♀️' }
  ],
  B: [
    { name: 'Mula Sem Cabeça', element: 'water' as const, emoji: '🐴' },
    { name: 'Lobisomem', element: 'fire' as const, emoji: '🐺' },
    { name: 'Cuca', element: 'water' as const, emoji: '🐊' },
    { name: 'Capelobo', element: 'fire' as const, emoji: '🦡' },
    { name: 'Corpo-Seco', element: 'impact' as const, emoji: '💀' }
  ],
  C: [
    { name: 'Boitatá', element: 'water' as const, emoji: '🐍' },
    { name: 'Mapinguari', element: 'fire' as const, emoji: '🦧' },
    { name: 'Cobra Grande', element: 'impact' as const, emoji: '🐍' },
    { name: 'Boto Cor-de-Rosa', element: 'impact' as const, emoji: '🐬' },
    { name: 'Labatut', element: 'impact' as const, emoji: '👹' }
  ]
}

const MONSTER_HP = { A: 1, B: 4, C: 10 }
const MONSTER_SPEED = { A: 0.025, B: 0.018, C: 0.012 }

// Wave composition
const WAVE_COMPOSITION: { A: number; B: number; C: number }[] = [
  { A: 1, B: 0, C: 0 }, { A: 2, B: 0, C: 0 }, { A: 3, B: 0, C: 0 },
  { A: 1, B: 1, C: 0 }, { A: 2, B: 1, C: 0 }, { A: 3, B: 1, C: 0 },
  { A: 2, B: 2, C: 0 }, { A: 3, B: 2, C: 0 }, { A: 3, B: 3, C: 0 },
  { A: 1, B: 1, C: 1 }, { A: 2, B: 1, C: 1 }, { A: 3, B: 1, C: 1 },
  { A: 2, B: 2, C: 1 }, { A: 3, B: 2, C: 1 }, { A: 3, B: 3, C: 1 },
  { A: 2, B: 2, C: 2 }, { A: 3, B: 2, C: 2 }, { A: 3, B: 3, C: 2 },
  { A: 3, B: 3, C: 3 }, { A: 4, B: 4, C: 4 }
]

// Tower definitions
const TOWER_TYPES: Record<string, { 
  name: string; 
  damage: number; 
  range: number; 
  cooldown: number;
  element: 'fire' | 'water' | 'impact';
  emoji: string;
  materials: { name: string; type: 'basico' | 'especial' | 'base' | 'essencial' }[];
}> = {
  'sentinela_nerf': {
    name: 'Sentinela Nerf', damage: 2, range: 3, cooldown: 1000, element: 'impact', emoji: '🔫',
    materials: [
      { name: 'Pistola Nerf', type: 'essencial' },
      { name: 'Base Ventilador', type: 'base' },
      { name: 'Fios', type: 'especial' }
    ]
  },
  'metralhadora_vulcan': {
    name: 'Metralhadora Vulcan', damage: 4, range: 3, cooldown: 800, element: 'impact', emoji: '🔫',
    materials: [
      { name: 'Nerf Vulcan', type: 'essencial' },
      { name: 'Base Ventilador', type: 'base' },
      { name: 'Fios', type: 'especial' }
    ]
  },
  'sentinela_fogo': {
    name: 'Sentinela de Fogo', damage: 3, range: 2, cooldown: 1200, element: 'fire', emoji: '🔥',
    materials: [
      { name: 'Super Soaker', type: 'essencial' },
      { name: 'Tripé de Câmera', type: 'base' },
      { name: 'Fios', type: 'especial' }
    ]
  },
  'canhao_tenis': {
    name: 'Canhão de Tênis', damage: 5, range: 2, cooldown: 2000, element: 'impact', emoji: '🎾',
    materials: [
      { name: 'Soprador de Folhas', type: 'essencial' },
      { name: 'Carrinho de Mão', type: 'base' },
      { name: 'Tubo de PVC', type: 'especial' }
    ]
  },
  'mina_goma': {
    name: 'Mina de Goma', damage: 3, range: 0, cooldown: 3000, element: 'impact', emoji: '🪤',
    materials: [
      { name: 'Ratoeira', type: 'essencial' },
      { name: 'Caixa de Papelão', type: 'base' }
    ]
  },
  'lancador_geleca': {
    name: 'Lançador de Geleca', damage: 2, range: 2, cooldown: 1500, element: 'impact', emoji: '🧫',
    materials: [
      { name: 'Pá de Jardim', type: 'essencial' },
      { name: 'Estacas Madeira', type: 'base' },
      { name: 'Barbante', type: 'especial' }
    ]
  },
  'armadilha_gude': {
    name: 'Armadilha de Gude', damage: 2, range: 0, cooldown: 2000, element: 'impact', emoji: '⚪',
    materials: [
      { name: 'Pote de Vidro', type: 'essencial' },
      { name: 'Estacas Madeira', type: 'base' },
      { name: 'Barbante', type: 'especial' }
    ]
  },
  'morteiro_agua': {
    name: 'Morteiro de Água', damage: 2, range: 3, cooldown: 1500, element: 'water', emoji: '💧',
    materials: [
      { name: 'Estacas Madeira', type: 'base' },
      { name: 'Tubo de PVC', type: 'especial' }
    ]
  },
  'spray_pimenta': {
    name: 'Spray de Pimenta', damage: 3, range: 1, cooldown: 1200, element: 'fire', emoji: '🌶️',
    materials: [
      { name: 'Pulverizador', type: 'essencial' },
      { name: 'Barbante', type: 'especial' }
    ]
  },
  'bambole_fogo': {
    name: 'Bambolê de Fogo', damage: 4, range: 1, cooldown: 2000, element: 'fire', emoji: '⭕',
    materials: [
      { name: 'Bambolê', type: 'essencial' },
      { name: 'Madeirite', type: 'basico' },
      { name: 'Barbante', type: 'especial' }
    ]
  },
  'tapete_brasas': {
    name: 'Tapete de Brasas', damage: 3, range: 0, cooldown: 2500, element: 'fire', emoji: '🔥',
    materials: [
      { name: 'Tapete Velho', type: 'essencial' },
      { name: 'Chapa de Metal', type: 'base' },
      { name: 'Fios', type: 'especial' }
    ]
  },
  'aspersor_lama': {
    name: 'Aspersor de Lama', damage: 2, range: 2, cooldown: 1200, element: 'water', emoji: '💧',
    materials: [
      { name: 'Aspersor Oscilante', type: 'essencial' },
      { name: 'Balde', type: 'base' },
      { name: 'Tubo de PVC', type: 'especial' }
    ]
  },
  'pendulo_pneu': {
    name: 'Pêndulo de Pneu', damage: 6, range: 1, cooldown: 3000, element: 'impact', emoji: '⚫',
    materials: [
      { name: 'Pneu de Carro', type: 'essencial' },
      { name: 'Madeirite', type: 'basico' },
      { name: 'Barbante', type: 'especial' }
    ]
  },
  'besta_lapis': {
    name: 'Besta de Lápis', damage: 3, range: 4, cooldown: 1000, element: 'impact', emoji: '📐',
    materials: [
      { name: 'Motor Elétrico', type: 'essencial' },
      { name: 'Caixote Madeira', type: 'base' },
      { name: 'Fios', type: 'especial' }
    ]
  },
  'armadilha_choque': {
    name: 'Armadilha Choque', damage: 5, range: 0, cooldown: 2500, element: 'impact', emoji: '⚡',
    materials: [
      { name: 'Bateria de Carro', type: 'essencial' },
      { name: 'Fios', type: 'especial' }
    ]
  }
}

// Element effectiveness
const ELEMENT_EFFECTIVENESS: Record<string, string[]> = {
  fire: ['Caipora', 'Pisadeira', 'Lobisomem', 'Capelobo', 'Mapinguari'],
  water: ['Saci', 'Matinta Perêra', 'Mula Sem Cabeça', 'Cuca', 'Boitatá'],
  impact: ['Curupira', 'Corpo-Seco', 'Cobra Grande', 'Boto Cor-de-Rosa', 'Labatut']
}

// Items available - ALL shown in morning
const BASICOS_ITEMS = [
  { name: 'Fita Adesiva', emoji: '🩹' },
  { name: 'Madeirite', emoji: '🪵' },
  { name: 'Elásticos', emoji: '⭕' }
]

const ESPECIAIS_ITEMS = [
  { name: 'Fios', emoji: '🔌', price: 1 },
  { name: 'Barbante', emoji: '🧵', price: 1 },
  { name: 'Tubo de PVC', emoji: '🔧', price: 1 }
]

const BASE_ITEMS = [
  { name: 'Base Ventilador', emoji: '🌀', price: 2 },
  { name: 'Tripé de Câmera', emoji: '📷', price: 2 },
  { name: 'Carrinho de Mão', emoji: '🛒', price: 2 },
  { name: 'Estacas Madeira', emoji: '🪓', price: 2 },
  { name: 'Caixa de Papelão', emoji: '📦', price: 2 },
  { name: 'Chapa de Metal', emoji: '🔩', price: 2 },
  { name: 'Balde', emoji: '🪣', price: 2 },
  { name: 'Caixote Madeira', emoji: '🗃️', price: 2 }
]

const ESSENCIAIS_ITEMS = [
  { name: 'Pistola Nerf', emoji: '🔫', price: 3 },
  { name: 'Nerf Vulcan', emoji: '🔫', price: 4 },
  { name: 'Super Soaker', emoji: '🔫', price: 3 },
  { name: 'Soprador de Folhas', emoji: '🌬️', price: 3 },
  { name: 'Ratoeira', emoji: '🪤', price: 2 },
  { name: 'Pá de Jardim', emoji: '🪴', price: 2 },
  { name: 'Pote de Vidro', emoji: '🫙', price: 1 },
  { name: 'Pulverizador', emoji: '🧴', price: 2 },
  { name: 'Bambolê', emoji: '⭕', price: 2 },
  { name: 'Tapete Velho', emoji: '🧶', price: 1 },
  { name: 'Pneu de Carro', emoji: '⚫', price: 3 },
  { name: 'Motor Elétrico', emoji: '⚙️', price: 4 },
  { name: 'Bateria de Carro', emoji: '🔋', price: 4 },
  { name: 'Aspersor Oscilante', emoji: '💦', price: 2 }
]

// Path
const MONSTER_PATH: Position[] = [
  { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
  { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
  { x: 7, y: 3 }, { x: 7, y: 2 }, { x: 8, y: 2 }, { x: 9, y: 2 },
  { x: 10, y: 2 }, { x: 11, y: 2 }, { x: 11, y: 3 }, { x: 11, y: 4 },
  { x: 12, y: 4 }, { x: 13, y: 4 }
]

// Tower slots
const TOWER_SLOTS: Position[] = [
  { x: 2, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 2 }, { x: 3, y: 6 },
  { x: 4, y: 3 }, { x: 4, y: 5 }, { x: 5, y: 3 }, { x: 5, y: 5 },
  { x: 8, y: 1 }, { x: 8, y: 3 }, { x: 9, y: 1 }, { x: 9, y: 3 },
  { x: 10, y: 1 }, { x: 10, y: 3 }, { x: 10, y: 5 }, { x: 12, y: 3 }, { x: 12, y: 5 }
]

const DOORS: Position[] = [{ x: 6, y: 4 }, { x: 11, y: 4 }]
const ROOM_TILES: Position[] = [{ x: 13, y: 3 }, { x: 13, y: 4 }, { x: 13, y: 5 }]

const YARD_TILES: Position[] = []
for (let x = 0; x < 7; x++) {
  for (let y = 0; y < GRID_HEIGHT; y++) {
    YARD_TILES.push({ x, y })
  }
}

// ==================== HELPER FUNCTIONS ====================
const createGrid = (): string[][] => {
  const grid: string[][] = []
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const row: string[] = []
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (ROOM_TILES.some(t => t.x === x && t.y === y)) row.push('room')
      else if (DOORS.some(t => t.x === x && t.y === y)) row.push('door')
      else if (TOWER_SLOTS.some(t => t.x === x && t.y === y)) row.push('tower_slot')
      else if (YARD_TILES.some(t => t.x === x && t.y === y)) row.push('yard')
      else row.push('house')
    }
    grid.push(row)
  }
  return grid
}

const getTileColor = (tileType: string, x: number, y: number): string => {
  const isPath = MONSTER_PATH.some(p => p.x === x && p.y === y)
  switch (tileType) {
    case 'yard': return isPath ? '#32CD32' : '#228B22'
    case 'house': return isPath ? '#DC143C' : '#8B0000'
    case 'door': return '#8B4513'
    case 'room': return '#FFD700'
    case 'tower_slot': return '#F5F5F5'
    default: return '#333'
  }
}

const cardIdRef = { current: 0 }

// ==================== MAIN COMPONENT ====================
export default function Home() {
  const [grid] = useState<string[][]>(createGrid)
  const [gameState, setGameState] = useState<GameState>({
    phase: 'menu',
    night: 1,
    relics: 3,
    coins: 10,
    monsters: [],
    towers: [],
    hand: [],
    monstersKilled: 0,
    isWaveActive: false,
    monstersToSpawn: 0,
    selectedCard: null,
    message: '',
    actionsUsed: 0,
    maxActions: 1
  })

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const spawnLoopRef = useRef<NodeJS.Timeout | null>(null)
  const monsterIdRef = useRef(0)
  const pendingMonstersRef = useRef<Monster[]>([])
  const spawnedCountRef = useRef(0)

  const actionsRemaining = gameState.maxActions - gameState.actionsUsed

  // Create monster
  const createMonster = useCallback((category: 'A' | 'B' | 'C'): Monster => {
    const types = MONSTER_TYPES[category]
    const randomIndex = Math.floor(Math.random() * types.length)
    const type = types[randomIndex]
    monsterIdRef.current++
    return {
      id: monsterIdRef.current,
      name: type.name,
      category,
      position: { ...MONSTER_PATH[0] },
      health: MONSTER_HP[category],
      maxHealth: MONSTER_HP[category],
      speed: MONSTER_SPEED[category],
      pathIndex: 0,
      element: type.element,
      slowTurns: 0,
      burnTurns: 0,
      skipNextTrap: false
    }
  }, [])

  // Add card to hand
  const addCardToHand = useCallback((card: Omit<Card, 'id'>): boolean => {
    let added = false
    setGameState(prev => {
      if (prev.hand.length >= MAX_HAND_SIZE) {
        return { ...prev, message: '❌ Mão cheia! (máx 6 cartas)' }
      }
      
      const existingCard = prev.hand.find(c => c.name === card.name && c.type === card.type)
      if (existingCard && card.type !== 'weapon') {
        return {
          ...prev,
          hand: prev.hand.map(c => 
            c.id === existingCard.id 
              ? { ...c, quantity: c.quantity + card.quantity }
              : c
          ),
          message: `✅ ${card.name} x${card.quantity} adicionado!`
        }
      }
      
      cardIdRef.current++
      added = true
      return {
        ...prev,
        hand: [...prev.hand, { ...card, id: cardIdRef.current }],
        message: `✅ ${card.name} adicionado!`
      }
    })
    return added
  }, [])

  // Remove card from hand
  const removeCardFromHand = useCallback((cardId: number, quantity: number = 1) => {
    setGameState(prev => {
      const card = prev.hand.find(c => c.id === cardId)
      if (!card) return prev
      
      if (card.quantity <= quantity) {
        return { ...prev, hand: prev.hand.filter(c => c.id !== cardId) }
      }
      
      return {
        ...prev,
        hand: prev.hand.map(c => 
          c.id === cardId ? { ...c, quantity: c.quantity - quantity } : c
        )
      }
    })
  }, [])

  // Pick basic item (free) - player chooses which one
  const pickBasicItem = (item: { name: string; emoji: string }) => {
    if (gameState.hand.length >= MAX_HAND_SIZE) {
      setGameState(prev => ({ ...prev, message: '❌ Mão cheia! (máx 6 cartas)' }))
      return
    }
    if (actionsRemaining <= 0) {
      setGameState(prev => ({ ...prev, message: '❌ Sem ações restantes!' }))
      return
    }
    
    addCardToHand({ type: 'basico', name: item.name, quantity: 1, emoji: item.emoji })
    setGameState(prev => ({ ...prev, actionsUsed: prev.actionsUsed + 1 }))
  }

  // Buy special item (1 coin) - in morning
  const buySpecialItem = (item: { name: string; emoji: string; price: number }) => {
    if (gameState.coins < item.price) {
      setGameState(prev => ({ ...prev, message: '❌ Moedas insuficientes!' }))
      return
    }
    if (gameState.hand.length >= MAX_HAND_SIZE) {
      setGameState(prev => ({ ...prev, message: '❌ Mão cheia! (máx 6 cartas)' }))
      return
    }
    if (actionsRemaining <= 0) {
      setGameState(prev => ({ ...prev, message: '❌ Sem ações restantes!' }))
      return
    }
    
    setGameState(prev => ({ 
      ...prev, 
      coins: prev.coins - item.price,
      actionsUsed: prev.actionsUsed + 1
    }))
    addCardToHand({ type: 'especial', name: item.name, quantity: 1, emoji: item.emoji })
  }

  // Buy item (afternoon - base and essencial)
  const buyItem = (item: { name: string; emoji: string; price: number }, type: 'base' | 'essencial') => {
    if (gameState.coins < item.price) {
      setGameState(prev => ({ ...prev, message: '❌ Moedas insuficientes!' }))
      return
    }
    if (gameState.hand.length >= MAX_HAND_SIZE) {
      setGameState(prev => ({ ...prev, message: '❌ Mão cheia! (máx 6 cartas)' }))
      return
    }
    if (actionsRemaining <= 0) {
      setGameState(prev => ({ ...prev, message: '❌ Sem ações restantes!' }))
      return
    }
    
    setGameState(prev => ({ 
      ...prev, 
      coins: prev.coins - item.price,
      actionsUsed: prev.actionsUsed + 1
    }))
    addCardToHand({ type, name: item.name, quantity: 1, emoji: item.emoji })
  }

  // Craft weapon - uses 1 action
  const craftWeapon = (towerKey: string) => {
    const tower = TOWER_TYPES[towerKey]
    if (!tower) return
    
    if (actionsRemaining <= 0) {
      setGameState(prev => ({ ...prev, message: '❌ Sem ações restantes! Use uma ação para criar.' }))
      return
    }
    
    // Check materials
    const missingMaterials: string[] = []
    for (const mat of tower.materials) {
      const card = gameState.hand.find(c => c.name === mat.name && c.quantity >= 1)
      if (!card) missingMaterials.push(mat.name)
    }
    
    if (missingMaterials.length > 0) {
      setGameState(prev => ({ ...prev, message: `❌ Faltam: ${missingMaterials.join(', ')}` }))
      return
    }
    
    if (gameState.hand.length >= MAX_HAND_SIZE) {
      const existingWeapon = gameState.hand.find(c => c.name === tower.name && c.type === 'weapon')
      if (!existingWeapon) {
        setGameState(prev => ({ ...prev, message: '❌ Mão cheia! Libere espaço.' }))
        return
      }
    }
    
    // Consume materials
    for (const mat of tower.materials) {
      const card = gameState.hand.find(c => c.name === mat.name)
      if (card) removeCardFromHand(card.id, 1)
    }
    
    addCardToHand({ type: 'weapon', name: tower.name, quantity: 1, towerKey, emoji: tower.emoji })
    setGameState(prev => ({ 
      ...prev, 
      actionsUsed: prev.actionsUsed + 1,
      message: `🔨 ${tower.name} criado! Clique na carta e depois no tabuleiro para posicionar.`
    }))
  }

  // Place weapon on board
  const placeWeapon = (x: number, y: number) => {
    if (gameState.phase === 'night') return
    if (!gameState.selectedCard) return
    
    const selectedCardData = gameState.hand.find(c => c.id === gameState.selectedCard)
    if (!selectedCardData || selectedCardData.type !== 'weapon') return
    
    const tile = grid[y][x]
    if (tile !== 'tower_slot') return
    if (gameState.towers.some(t => t.position.x === x && t.position.y === y)) return
    
    const towerType = TOWER_TYPES[selectedCardData.towerKey!]
    if (!towerType) return
    
    const newTower: Tower = {
      id: Date.now(),
      name: towerType.name,
      position: { x, y },
      damage: towerType.damage,
      range: towerType.range,
      cooldown: towerType.cooldown,
      lastShot: 0,
      element: towerType.element,
      disabled: 0
    }
    
    removeCardFromHand(gameState.selectedCard)
    setGameState(prev => ({
      ...prev,
      towers: [...prev.towers, newTower],
      selectedCard: null,
      message: `✅ ${towerType.name} posicionada!`
    }))
  }

  // Start night
  const startNight = useCallback(() => {
    // Clear any existing intervals first
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
      gameLoopRef.current = null
    }
    if (spawnLoopRef.current) {
      clearInterval(spawnLoopRef.current)
      spawnLoopRef.current = null
    }
    
    const composition = WAVE_COMPOSITION[gameState.night - 1]
    const monsters: Monster[] = []
    
    for (let i = 0; i < composition.A; i++) monsters.push(createMonster('A'))
    for (let i = 0; i < composition.B; i++) monsters.push(createMonster('B'))
    for (let i = 0; i < composition.C; i++) monsters.push(createMonster('C'))
    
    // Store monsters in ref for spawning
    pendingMonstersRef.current = monsters
    spawnedCountRef.current = 0
    
    console.log(`Starting night ${gameState.night} with ${monsters.length} monsters`)
    
    setGameState(prev => ({
      ...prev,
      phase: 'night',
      monsters: [],
      isWaveActive: true,
      monstersToSpawn: monsters.length,
      selectedCard: null,
      message: `🌙 Noite ${prev.night}: Invasão iniciada! ${monsters.length} monstros virão.`
    }))
  }, [gameState.night, createMonster])

  // Game loop for night
  useEffect(() => {
    if (gameState.phase !== 'night') {
      // Clean up intervals when not in night phase
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = null
      }
      if (spawnLoopRef.current) {
        clearInterval(spawnLoopRef.current)
        spawnLoopRef.current = null
      }
      return
    }

    console.log('Starting night game loop')

    // Spawn timer - spawn a monster every 2 seconds
    spawnLoopRef.current = setInterval(() => {
      if (spawnedCountRef.current >= pendingMonstersRef.current.length) {
        if (spawnLoopRef.current) {
          clearInterval(spawnLoopRef.current)
          spawnLoopRef.current = null
        }
        return
      }
      
      const monster = pendingMonstersRef.current[spawnedCountRef.current]
      console.log(`Spawning monster: ${monster.name}`)
      
      setGameState(prev => ({
        ...prev,
        monsters: [...prev.monsters, monster],
        monstersToSpawn: prev.monstersToSpawn - 1
      }))
      
      spawnedCountRef.current++
    }, 2000)

    // Game loop - runs every 100ms
    gameLoopRef.current = setInterval(() => {
      const now = Date.now()

      setGameState(prev => {
        if (prev.phase !== 'night') return prev
        
        const newMonsters: Monster[] = []
        let newRelics = prev.relics
        let newKilled = prev.monstersKilled
        let newCoins = prev.coins
        let newHand = [...prev.hand]
        const newTowers = prev.towers.map(t => {
          if (t.disabled > 0) return { ...t, disabled: t.disabled - 1 }
          return t
        })

        // Process each monster
        for (const monster of prev.monsters) {
          let currentHealth = monster.health
          if (monster.burnTurns > 0) {
            currentHealth -= 1
          }

          // Check if dead from burn
          if (currentHealth <= 0) {
            newKilled++
            newCoins += monster.category === 'A' ? 1 : monster.category === 'B' ? 2 : 3
            continue
          }

          const speedMultiplier = monster.slowTurns > 0 ? 0.5 : 1
          const lobisomemBonus = monster.name === 'Lobisomem' && 
                                  monster.health < monster.maxHealth ? 1.5 : 1
          const effectiveSpeed = monster.speed * speedMultiplier * lobisomemBonus

          const targetIndex = monster.pathIndex + 1
          if (targetIndex >= MONSTER_PATH.length) {
            newRelics--
            if (newRelics <= 0) return { ...prev, relics: 0, phase: 'gameover' }
            continue
          }

          const target = MONSTER_PATH[targetIndex]
          const current = monster.position
          const dx = target.x - current.x
          const dy = target.y - current.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < effectiveSpeed) {
            newMonsters.push({
              ...monster,
              health: currentHealth,
              position: { x: target.x, y: target.y },
              pathIndex: targetIndex,
              slowTurns: Math.max(0, monster.slowTurns - 1),
              burnTurns: Math.max(0, monster.burnTurns - 1)
            })
          } else {
            newMonsters.push({
              ...monster,
              health: currentHealth,
              position: {
                x: current.x + (dx / dist) * effectiveSpeed,
                y: current.y + (dy / dist) * effectiveSpeed
              },
              slowTurns: Math.max(0, monster.slowTurns - 1),
              burnTurns: Math.max(0, monster.burnTurns - 1)
            })
          }
        }

        // Tower attacks
        for (const tower of newTowers) {
          if (tower.disabled > 0) continue
          if (now - tower.lastShot < tower.cooldown) continue

          let targetMonster: Monster | null = null
          let minDist = Infinity

          for (const monster of newMonsters) {
            if (monster.name === 'Boitatá' && tower.range > 0) continue

            const dx = monster.position.x - tower.position.x
            const dy = monster.position.y - tower.position.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (tower.range === 0) {
              if (dist < 0.5 && dist < minDist) {
                minDist = dist
                targetMonster = monster
              }
            } else if (dist <= tower.range && dist < minDist) {
              minDist = dist
              targetMonster = monster
            }
          }

          if (targetMonster) {
            let damage = tower.damage
            if (ELEMENT_EFFECTIVENESS[tower.element].includes(targetMonster.name)) {
              damage *= 2
            }
            if (targetMonster.name === 'Capelobo') {
              damage = Math.max(1, Math.floor(damage * 0.5))
            }

            if (targetMonster.name === 'Mula Sem Cabeça' && tower.range === 0 && !targetMonster.skipNextTrap) {
              const idx = newMonsters.findIndex(m => m.id === targetMonster!.id)
              if (idx >= 0) {
                newMonsters[idx] = { ...newMonsters[idx], skipNextTrap: true }
              }
              tower.lastShot = now
              continue
            }

            const idx = newMonsters.findIndex(m => m.id === targetMonster!.id)
            if (idx >= 0) {
              newMonsters[idx] = {
                ...newMonsters[idx],
                health: newMonsters[idx].health - damage,
                slowTurns: tower.element === 'water' ? 3 : newMonsters[idx].slowTurns,
                burnTurns: tower.element === 'fire' ? 2 : newMonsters[idx].burnTurns
              }
            }

            tower.lastShot = now
          }
        }

        // Check for killed monsters
        const finalMonsters: Monster[] = []
        for (const monster of newMonsters) {
          if (monster.health <= 0) {
            newKilled++
            newCoins += monster.category === 'A' ? 1 : monster.category === 'B' ? 2 : 3
            
            if (monster.name === 'Cobra Grande' && newHand.length > 0) {
              newHand = newHand.slice(0, -1)
            }
            
            if (monster.name === 'Corpo-Seco') {
              const nearbyTower = newTowers.find(t => {
                const tdx = t.position.x - monster.position.x
                const tdy = t.position.y - monster.position.y
                return Math.sqrt(tdx * tdx + tdy * tdy) < 2 && t.disabled === 0
              })
              if (nearbyTower) {
                nearbyTower.disabled = 5
              }
            }
            continue
          }
          finalMonsters.push(monster)
        }

        return { 
          ...prev, 
          monsters: finalMonsters, 
          relics: newRelics, 
          monstersKilled: newKilled, 
          coins: newCoins, 
          hand: newHand,
          towers: newTowers
        }
      })

      // Check wave completion
      setGameState(prev => {
        if (prev.phase !== 'night') return prev
        if (prev.monsters.length === 0 && prev.monstersToSpawn === 0 && prev.isWaveActive) {
          console.log('Wave complete!')
          if (prev.night >= 20) {
            return { ...prev, phase: 'victory', isWaveActive: false }
          }
          return {
            ...prev,
            phase: 'morning',
            night: prev.night + 1,
            isWaveActive: false,
            actionsUsed: 0,
            maxActions: 1,
            message: `☀️ Manhã da Noite ${prev.night + 1}: 1 ação disponível`
          }
        }
        return prev
      })
    }, 100)

    return () => {
      console.log('Cleaning up night intervals')
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = null
      }
      if (spawnLoopRef.current) {
        clearInterval(spawnLoopRef.current)
        spawnLoopRef.current = null
      }
    }
  }, [gameState.phase])

  // Start game
  const startGame = () => {
    // Clear any existing intervals
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
      gameLoopRef.current = null
    }
    if (spawnLoopRef.current) {
      clearInterval(spawnLoopRef.current)
      spawnLoopRef.current = null
    }
    
    // Reset refs
    cardIdRef.current = 0
    monsterIdRef.current = 0
    pendingMonstersRef.current = []
    spawnedCountRef.current = 0
    
    setGameState({
      phase: 'morning',
      night: 1,
      relics: 3,
      coins: 10,
      monsters: [],
      towers: [],
      hand: [],
      monstersKilled: 0,
      isWaveActive: false,
      monstersToSpawn: 0,
      selectedCard: null,
      message: '☀️ Manhã: Escolha 1 item (Básico grátis ou Especial por 1 moeda)',
      actionsUsed: 0,
      maxActions: 1
    })
    setSelectedRecipe(null)
  }

  // Proceed to afternoon
  const proceedToAfternoon = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'afternoon',
      actionsUsed: 0,
      maxActions: 2,
      message: '🌅 Tarde: Até 2 ações disponíveis (opcional)'
    }))
  }

  // Render screens
  if (gameState.phase === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-green-900 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-5xl font-bold text-green-400 mb-2">🌳 PROJECT FOLK</h1>
          <p className="text-2xl text-yellow-400 mb-6">O Despertar das Lendas</p>
          
          <div className="bg-gray-800/80 rounded-lg p-6 mb-6 text-left">
            <h2 className="text-xl text-white font-semibold mb-4">📜 Regras:</h2>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>• <strong className="text-yellow-400">20 Noites</strong> para sobreviver</li>
              <li>• <strong className="text-red-400">3 Relíquias</strong> - monstros no quarto destroem 1</li>
              <li>• <strong className="text-blue-400">Mão: máx 6 cartas</strong></li>
              <li>• <strong className="text-yellow-400">10 moedas</strong> iniciais</li>
              <li>• <strong className="text-orange-400">Manhã:</strong> 1 ação | <strong className="text-orange-400">Tarde:</strong> até 2 ações</li>
            </ul>
            
            <h3 className="text-lg text-white font-semibold mt-4 mb-2">💰 Itens:</h3>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• <strong className="text-green-400">Básicos:</strong> Grátis (manhã)</li>
              <li>• <strong className="text-blue-400">Especiais:</strong> 1 moeda (manhã)</li>
              <li>• <strong className="text-purple-400">Base:</strong> 2 moedas (tarde)</li>
              <li>• <strong className="text-red-400">Essenciais:</strong> 1-4 moedas (tarde)</li>
            </ul>
          </div>
          
          <button
            onClick={startGame}
            className="bg-green-600 hover:bg-green-500 text-white text-2xl font-bold py-4 px-12 rounded-lg shadow-lg transition-all hover:scale-105"
          >
            ▶️ COMEÇAR
          </button>
        </div>
      </div>
    )
  }

  if (gameState.phase === 'gameover') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-900 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-red-400 mb-4">💀 DERROTA!</h1>
          <p className="text-xl text-gray-400 mb-8">
            Noite {gameState.night} | Monstros: {gameState.monstersKilled}
          </p>
          <button onClick={startGame} className="bg-red-600 hover:bg-red-500 text-white text-xl font-bold py-3 px-8 rounded-lg">
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  if (gameState.phase === 'victory') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-600 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-yellow-300 mb-4">🏆 VITÓRIA!</h1>
          <p className="text-xl text-gray-300 mb-8">Monstros derrotados: {gameState.monstersKilled}</p>
          <button onClick={startGame} className="bg-yellow-600 hover:bg-yellow-500 text-white text-xl font-bold py-3 px-8 rounded-lg">
            🔄 Jogar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-2">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-2">
        <div className="flex flex-wrap justify-between items-center bg-gray-800 rounded-lg p-2 gap-2">
          <div className="flex gap-3 flex-wrap text-sm">
            <div className="text-yellow-400 font-bold">💰 {gameState.coins}</div>
            <div className="text-red-400 font-bold">🏺 {gameState.relics}/3</div>
            <div className="text-blue-400 font-bold">🌙 {gameState.night}/20</div>
            <div className="text-green-400 font-bold">💀 {gameState.monstersKilled}</div>
            <div className="text-purple-400 font-bold">🃏 {gameState.hand.length}/{MAX_HAND_SIZE}</div>
            <div className="text-orange-400 font-bold">⚡ {actionsRemaining}/{gameState.maxActions} ações</div>
          </div>
          <div className="text-white font-bold px-3 py-1 rounded bg-gray-700">
            {gameState.phase === 'morning' && '☀️ MANHÃ'}
            {gameState.phase === 'afternoon' && '🌅 TARDE'}
            {gameState.phase === 'night' && '🌙 NOITE'}
          </div>
        </div>
      </div>

      {/* Message */}
      {gameState.message && (
        <div className="max-w-7xl mx-auto mb-2">
          <div className="bg-gray-700 text-white text-center py-2 px-4 rounded-lg text-sm">
            {gameState.message}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-4">
        {/* Game Board */}
        <div className="flex-shrink-0">
          <div 
            className="inline-grid gap-0.5 bg-gray-700 p-1 rounded-lg shadow-2xl"
            style={{
              gridTemplateColumns: `repeat(${GRID_WIDTH}, ${TILE_SIZE}px)`,
              gridTemplateRows: `repeat(${GRID_HEIGHT}, ${TILE_SIZE}px)`
            }}
          >
            {grid.map((row, y) =>
              row.map((tileType, x) => {
                const tower = gameState.towers.find(t => t.position.x === x && t.position.y === y)
                const monstersOnTile = gameState.monsters.filter(
                  m => Math.floor(m.position.x) === x && Math.floor(m.position.y) === y
                )
                
                return (
                  <div
                    key={`${x}-${y}`}
                    onClick={() => placeWeapon(x, y)}
                    className={`relative flex items-center justify-center transition-all ${
                      gameState.phase !== 'night' && gameState.selectedCard ? 'cursor-pointer hover:brightness-125' : ''
                    }`}
                    style={{
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      backgroundColor: getTileColor(tileType, x, y),
                      borderRadius: tileType === 'door' ? '4px' : '2px'
                    }}
                  >
                    {tower && (
                      <div className="absolute inset-0 flex items-center justify-center text-2xl z-10">
                        {tower.disabled > 0 ? '❌' : Object.values(TOWER_TYPES).find(t => t.name === tower.name)?.emoji}
                      </div>
                    )}
                    
                    {monstersOnTile.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="relative">
                          <span className="text-xl">
                            {MONSTER_TYPES[monstersOnTile[0].category].find(t => t.name === monstersOnTile[0].name)?.emoji}
                          </span>
                          <div className="absolute -top-1 left-0 right-0 h-1 bg-gray-800 rounded">
                            <div
                              className="h-full bg-green-500 rounded"
                              style={{ width: `${(monstersOnTile[0].health / monstersOnTile[0].maxHealth) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {tileType === 'tower_slot' && !tower && (
                      <span className="text-gray-500 text-lg opacity-50">+</span>
                    )}
                    {tileType === 'door' && <span className="text-base">🚪</span>}
                    {tileType === 'room' && <span className="text-base">🛏️</span>}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Player Hand */}
          <div className="bg-gray-800 rounded-lg p-3">
            <h3 className="text-white font-bold mb-2 text-sm">🃏 Mão ({gameState.hand.length}/{MAX_HAND_SIZE}):</h3>
            <div className="flex flex-wrap gap-1">
              {gameState.hand.map(card => (
                <div
                  key={card.id}
                  onClick={() => {
                    if (card.type === 'weapon' && gameState.phase !== 'night') {
                      setGameState(prev => ({ 
                        ...prev, 
                        selectedCard: prev.selectedCard === card.id ? null : card.id,
                        message: prev.selectedCard === card.id ? '' : `🎯 ${card.name} - clique em slot branco`
                      }))
                    }
                  }}
                  className={`p-2 rounded text-center min-w-14 transition-all text-xs ${
                    card.type === 'weapon' && gameState.phase !== 'night' 
                      ? 'cursor-pointer hover:scale-105' 
                      : ''
                  } ${
                    gameState.selectedCard === card.id 
                      ? 'ring-2 ring-yellow-400 bg-yellow-900' 
                      : card.type === 'weapon' ? 'bg-blue-900' 
                      : card.type === 'essencial' ? 'bg-red-900'
                      : card.type === 'base' ? 'bg-purple-900'
                      : card.type === 'especial' ? 'bg-blue-800'
                      : 'bg-green-800'
                  }`}
                >
                  <div className="text-xl">{card.emoji || '📦'}</div>
                  <div className="text-white font-semibold truncate">{card.name}</div>
                  {card.quantity > 1 && (
                    <div className="text-yellow-400">x{card.quantity}</div>
                  )}
                </div>
              ))}
              {gameState.hand.length === 0 && (
                <div className="text-gray-500 text-sm">Mão vazia</div>
              )}
            </div>
          </div>

          {/* Morning Phase */}
          {gameState.phase === 'morning' && (
            <div className="bg-gray-800 rounded-lg p-3">
              <h2 className="text-lg text-yellow-400 font-bold mb-3">☀️ MANHÃ (1 ação)</h2>
              
              {/* Básicos - Grátis */}
              <div className="mb-3">
                <h3 className="text-white font-semibold mb-1 text-sm">🟢 Básicos (GRÁTIS):</h3>
                <div className="flex flex-wrap gap-1">
                  {BASICOS_ITEMS.map(item => (
                    <button
                      key={item.name}
                      onClick={() => pickBasicItem(item)}
                      disabled={actionsRemaining <= 0 || gameState.hand.length >= MAX_HAND_SIZE}
                      className="bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {item.emoji} {item.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Especiais - 1 moeda */}
              <div className="mb-3">
                <h3 className="text-white font-semibold mb-1 text-sm">🔵 Especiais (1 moeda):</h3>
                <div className="flex flex-wrap gap-1">
                  {ESPECIAIS_ITEMS.map(item => (
                    <button
                      key={item.name}
                      onClick={() => buySpecialItem(item)}
                      disabled={actionsRemaining <= 0 || gameState.coins < item.price || gameState.hand.length >= MAX_HAND_SIZE}
                      className="bg-blue-800 hover:bg-blue-600 disabled:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {item.emoji} {item.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={proceedToAfternoon}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg text-sm"
              >
                ➡️ Ir para Tarde
              </button>
            </div>
          )}

          {/* Afternoon Phase */}
          {gameState.phase === 'afternoon' && (
            <div className="bg-gray-800 rounded-lg p-3">
              <h2 className="text-lg text-orange-400 font-bold mb-2">🌅 TARDE (até {actionsRemaining} ações)</h2>
              
              {/* Shop - Base */}
              <div className="mb-3">
                <h3 className="text-white font-semibold mb-1 text-sm">🟣 Base (2 moedas):</h3>
                <div className="flex flex-wrap gap-1">
                  {BASE_ITEMS.map(item => (
                    <button
                      key={item.name}
                      onClick={() => buyItem(item, 'base')}
                      disabled={actionsRemaining <= 0 || gameState.coins < item.price || gameState.hand.length >= MAX_HAND_SIZE}
                      className="bg-purple-800 hover:bg-purple-600 disabled:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {item.emoji} {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shop - Essenciais */}
              <div className="mb-3">
                <h3 className="text-white font-semibold mb-1 text-sm">🔴 Essenciais:</h3>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {ESSENCIAIS_ITEMS.map(item => (
                    <button
                      key={item.name}
                      onClick={() => buyItem(item, 'essencial')}
                      disabled={actionsRemaining <= 0 || gameState.coins < item.price || gameState.hand.length >= MAX_HAND_SIZE}
                      className="bg-red-800 hover:bg-red-600 disabled:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {item.emoji} {item.name} ({item.price})
                    </button>
                  ))}
                </div>
              </div>

              {/* Crafting */}
              <div className="mb-3">
                <h3 className="text-white font-semibold mb-1 text-sm">🔨 Criar Armas (clique para ver receita):</h3>
                <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto mb-2">
                  {Object.entries(TOWER_TYPES).map(([key, tower]) => {
                    // Check which materials are missing
                    const missingMaterials = tower.materials.filter(mat => 
                      !gameState.hand.some(c => c.name === mat.name && c.quantity >= 1)
                    )
                    const hasAllMaterials = missingMaterials.length === 0
                    
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedRecipe(selectedRecipe === key ? null : key)}
                        className={`p-2 rounded text-left text-xs transition-all ${
                          selectedRecipe === key 
                            ? 'bg-yellow-700 ring-2 ring-yellow-400' 
                            : 'bg-blue-900 hover:bg-blue-700'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-lg">{tower.emoji}</span>
                          <span className="font-semibold truncate">{tower.name}</span>
                        </div>
                        <div className="text-gray-300 text-xs">
                          Dano: {tower.damage} | Alcance: {tower.range}
                        </div>
                        {!hasAllMaterials && (
                          <div className="text-red-400 text-xs mt-0.5">
                            ⚠️ Faltam {missingMaterials.length} itens
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                
                {/* Selected Recipe Details */}
                {selectedRecipe && TOWER_TYPES[selectedRecipe] && (
                  <div className="bg-gray-700 rounded-lg p-2 mb-2">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-yellow-400 font-bold text-sm">
                        {TOWER_TYPES[selectedRecipe].emoji} {TOWER_TYPES[selectedRecipe].name}
                      </h4>
                      <button
                        onClick={() => craftWeapon(selectedRecipe)}
                        disabled={actionsRemaining <= 0}
                        className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-xs px-3 py-1 rounded font-bold"
                      >
                        CRIAR
                      </button>
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="text-gray-400">Materiais necessários:</p>
                      <div className="flex flex-wrap gap-1">
                        {TOWER_TYPES[selectedRecipe].materials.map((mat, idx) => {
                          const hasItem = gameState.hand.some(c => c.name === mat.name && c.quantity >= 1)
                          const itemData = [...BASICOS_ITEMS, ...ESPECIAIS_ITEMS, ...BASE_ITEMS, ...ESSENCIAIS_ITEMS].find(i => i.name === mat.name)
                          
                          return (
                            <span 
                              key={idx}
                              className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                                mat.type === 'essencial' ? (hasItem ? 'bg-red-800' : 'bg-red-900/50') :
                                mat.type === 'base' ? (hasItem ? 'bg-purple-800' : 'bg-purple-900/50') :
                                mat.type === 'especial' ? (hasItem ? 'bg-blue-700' : 'bg-blue-900/50') : 
                                (hasItem ? 'bg-green-700' : 'bg-green-900/50')
                              } ${hasItem ? 'text-white' : 'text-gray-500 line-through'}`}
                            >
                              <span>{itemData?.emoji || '📦'}</span>
                              <span>{mat.name}</span>
                              {hasItem ? (
                                <span className="text-green-400">✓</span>
                              ) : (
                                <span className="text-red-400">✗</span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                      <div className="text-gray-500 mt-1 flex gap-2">
                        <span>Elemento: {TOWER_TYPES[selectedRecipe].element === 'fire' ? '🔥 Fogo' : TOWER_TYPES[selectedRecipe].element === 'water' ? '💧 Água' : '💥 Impacto'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={startNight}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg text-sm"
              >
                🌙 INICIAR NOITE {gameState.night}
              </button>
            </div>
          )}

          {/* Night Phase */}
          {gameState.phase === 'night' && (
            <div className="bg-gray-800 rounded-lg p-3">
              <h2 className="text-lg text-blue-400 font-bold mb-3">🌙 NOITE - Invasão</h2>
              <p className="text-white mb-2 text-sm">
                Monstros: {gameState.monsters.length + gameState.monstersToSpawn}
              </p>
              <div className="bg-gray-700 rounded p-2 mb-2">
                <p className="text-yellow-400 text-sm">
                  Wave: A×{WAVE_COMPOSITION[gameState.night - 1]?.A || 0} 
                  B×{WAVE_COMPOSITION[gameState.night - 1]?.B || 0} 
                  C×{WAVE_COMPOSITION[gameState.night - 1]?.C || 0}
                </p>
              </div>
              
              <div className="max-h-24 overflow-y-auto">
                {gameState.monsters.slice(0, 5).map(m => (
                  <div key={m.id} className="flex justify-between items-center bg-gray-700 p-1 rounded mb-1 text-xs">
                    <span>
                      {MONSTER_TYPES[m.category].find(t => t.name === m.name)?.emoji} {m.name}
                    </span>
                    <span className="text-gray-400">
                      HP: {m.health}/{m.maxHealth}
                    </span>
                  </div>
                ))}
                {gameState.monsters.length > 5 && (
                  <div className="text-gray-500 text-xs">+{gameState.monsters.length - 5} mais...</div>
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="bg-gray-800 rounded-lg p-3">
            <h3 className="text-white font-semibold mb-2 text-sm">📋 Legenda:</h3>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#228B22'}}></div>
                <span className="text-gray-300">Quintal</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#8B0000'}}></div>
                <span className="text-gray-300">Casa</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#FFD700'}}></div>
                <span className="text-gray-300">Quarto</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
