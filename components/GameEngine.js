import React, { useRef, useEffect, useState, useCallback } from 'react';

// === CONSTANTS ===
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 600;
const GROUND_Y = 500;

// === TERRAIN GENERATION ===
class TerrainGenerator {
  static generateMountains() {
    const mountains = [];
    for (let i = 0; i < 8; i++) {
      mountains.push({
        x: (i * WORLD_WIDTH) / 7 + Math.random() * 200,
        height: 100 + Math.random() * 150,
        width: 150 + Math.random() * 100
      });
    }
    return mountains;
  }

  static generateTrees() {
    const trees = [];
    for (let i = 0; i < 25; i++) {
      trees.push({
        x: Math.random() * WORLD_WIDTH,
        y: GROUND_Y - Math.random() * 20,
        height: 40 + Math.random() * 30
      });
    }
    return trees;
  }

  static drawTerrain(ctx, camera, mountains, trees) {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.7, '#E0F6FF');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Mountains
    mountains.forEach(mountain => {
      const screenX = mountain.x - camera.x;
      if (screenX > -mountain.width && screenX < CANVAS_WIDTH + mountain.width) {
        ctx.fillStyle = '#8B7355';
        ctx.beginPath();
        ctx.moveTo(screenX, GROUND_Y);
        ctx.lineTo(screenX - mountain.width/2, GROUND_Y);
        ctx.lineTo(screenX, GROUND_Y - mountain.height);
        ctx.lineTo(screenX + mountain.width/2, GROUND_Y);
        ctx.closePath();
        ctx.fill();

        // Snow cap
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(screenX - mountain.width/4, GROUND_Y - mountain.height * 0.7);
        ctx.lineTo(screenX, GROUND_Y - mountain.height);
        ctx.lineTo(screenX + mountain.width/4, GROUND_Y - mountain.height * 0.7);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Ground
    ctx.fillStyle = '#8FBC8F';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Trees
    trees.forEach(tree => {
      const screenX = tree.x - camera.x;
      if (screenX > -50 && screenX < CANVAS_WIDTH + 50) {
        // Trunk
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(screenX - 3, tree.y - tree.height/3, 6, tree.height/3);
        
        // Leaves
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(screenX, tree.y - tree.height/2, tree.height/3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

// === PROJECTILES ===
class Projectile {
  constructor(x, y, targetX, targetY, damage, speed = 5, type = 'arrow') {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.speed = speed;
    this.type = type;
    this.active = true;
    
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
  }

  update() {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    
    if (this.x < 0 || this.x > WORLD_WIDTH || this.y < 0 || this.y > WORLD_HEIGHT) {
      this.active = false;
    }
  }

  draw(ctx, camera) {
    if (!this.active) return;
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    
    if (screenX < -10 || screenX > CANVAS_WIDTH + 10) return;
    
    ctx.strokeStyle = this.type === 'arrow' ? '#8B4513' : '#FF4500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX - this.vx * 2, screenY - this.vy * 2);
    ctx.stroke();
  }

  checkCollision(units, bases) {
    if (!this.active) return false;
    
    // Check unit collisions
    for (const unit of units) {
      if (unit.hp > 0 && Math.abs(unit.x - this.x) < 15 && Math.abs(unit.y - this.y) < 20) {
        unit.takeDamage(this.damage);
        this.active = false;
        return true;
      }
    }
    
    // Check base collisions
    for (const base of bases) {
      if (Math.abs(base.x - this.x) < 40 && Math.abs(base.y - this.y) < 60) {
        base.takeDamage(this.damage);
        this.active = false;
        return true;
      }
    }
    
    return false;
  }
}

// === UNITS ===
class Unit {
  constructor(x, side, type) {
    this.x = x;
    this.y = GROUND_Y;
    this.side = side;
    this.type = type;
    this.animFrame = 0;
    this.lastAttack = 0;
    this.target = null;
    
    this.setupStats();
  }

  setupStats() {
    const stats = {
      swordsman: { hp: 100, speed: 1.5, range: 25, damage: 25, cooldown: 800, cost: 50 },
      archer: { hp: 70, speed: 1.0, range: 200, damage: 30, cooldown: 1200, cost: 75 },
      spearman: { hp: 120, speed: 1.2, range: 35, damage: 20, cooldown: 600, cost: 60 },
      knight: { hp: 200, speed: 0.8, range: 30, damage: 40, cooldown: 1000, cost: 150 },
      mage: { hp: 50, speed: 0.9, range: 180, damage: 45, cooldown: 1500, cost: 200 },
      catapult: { hp: 80, speed: 0.5, range: 300, damage: 80, cooldown: 3000, cost: 300 }
    };
    
    const stat = stats[this.type];
    this.maxHp = stat.hp;
    this.hp = stat.hp;
    this.speed = stat.speed;
    this.range = stat.range;
    this.damage = stat.damage;
    this.cooldown = stat.cooldown;
    this.cost = stat.cost;
  }

  update(enemies, enemyBase, projectiles) {
    if (this.hp <= 0) return;
    
    this.animFrame += 0.1;
    
    // Find target
    this.target = this.findTarget(enemies, enemyBase);
    
    if (this.target) {
      const dist = Math.abs(this.target.x - this.x);
      
      if (dist <= this.range) {
        this.attack(projectiles);
      } else {
        this.move();
      }
    }
  }

  findTarget(enemies, enemyBase) {
    let closest = null;
    let minDist = Infinity;
    
    // Check enemy units
    enemies.forEach(enemy => {
      if (enemy.hp > 0) {
        const dist = Math.abs(enemy.x - this.x);
        if (dist < minDist) {
          minDist = dist;
          closest = enemy;
        }
      }
    });
    
    // Check enemy base
    const baseDist = Math.abs(enemyBase.x - this.x);
    if (baseDist < minDist) {
      closest = enemyBase;
    }
    
    return closest;
  }

  move() {
    const direction = this.side === 'left' ? 1 : -1;
    this.x += this.speed * direction;
    this.x = Math.max(50, Math.min(WORLD_WIDTH - 50, this.x));
  }

  attack(projectiles) {
    const now = performance.now();
    if (now - this.lastAttack < this.cooldown) return;
    
    if (this.type === 'archer' || this.type === 'mage' || this.type === 'catapult') {
      // Ranged attack
      projectiles.push(new Projectile(
        this.x, 
        this.y - 10, 
        this.target.x, 
        this.target.y - 10, 
        this.damage,
        this.type === 'catapult' ? 3 : 5,
        this.type === 'mage' ? 'magic' : 'arrow'
      ));
    } else {
      // Melee attack
      if (Math.abs(this.target.x - this.x) <= this.range) {
        this.target.takeDamage(this.damage);
      }
    }
    
    this.lastAttack = now;
  }

  takeDamage(damage) {
    this.hp -= damage;
  }

  draw(ctx, camera) {
    if (this.hp <= 0) return;
    
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    
    if (screenX < -50 || screenX > CANVAS_WIDTH + 50) return;
    
    this.drawStickFigure(ctx, screenX, screenY);
    this.drawHealthBar(ctx, screenX, screenY);
  }

  drawStickFigure(ctx, x, y) {
    const color = this.side === 'left' ? '#0066FF' : '#FF3333';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    
    const walkOffset = Math.sin(this.animFrame) * 2;
    
    // Head
    ctx.beginPath();
    ctx.arc(x, y - 35, 8, 0, Math.PI * 2);
    ctx.stroke();
    
    // Body
    ctx.beginPath();
    ctx.moveTo(x, y - 27);
    ctx.lineTo(x, y - 5);
    ctx.stroke();
    
    // Arms
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x - 10 + walkOffset, y - 15);
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x + 10 - walkOffset, y - 15);
    ctx.stroke();
    
    // Legs
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x - 8 + walkOffset, y + 10);
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 8 - walkOffset, y + 10);
    ctx.stroke();
    
    // Weapon/Equipment
    this.drawEquipment(ctx, x, y, color);
  }

  drawEquipment(ctx, x, y, color) {
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    
    switch (this.type) {
      case 'swordsman':
        ctx.beginPath();
        ctx.moveTo(x + 12, y - 25);
        ctx.lineTo(x + 12, y - 10);
        ctx.stroke();
        break;
      case 'archer':
        ctx.beginPath();
        ctx.arc(x - 12, y - 20, 8, 0, Math.PI);
        ctx.stroke();
        break;
      case 'spearman':
        ctx.beginPath();
        ctx.moveTo(x + 15, y - 30);
        ctx.lineTo(x + 15, y - 5);
        ctx.stroke();
        break;
      case 'knight':
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(x - 12, y - 30, 24, 15);
        break;
      case 'mage':
        ctx.strokeStyle = '#8A2BE2';
        ctx.beginPath();
        ctx.moveTo(x + 10, y - 35);
        ctx.lineTo(x + 10, y - 15);
        ctx.stroke();
        break;
      case 'catapult':
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - 15, y - 10, 30, 15);
        break;
    }
  }

  drawHealthBar(ctx, x, y) {
    const barWidth = 20;
    const barHeight = 3;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(x - barWidth/2, y - 45, barWidth, barHeight);
    
    ctx.fillStyle = this.hp > this.maxHp * 0.3 ? '#00FF00' : '#FF0000';
    const healthWidth = (this.hp / this.maxHp) * barWidth;
    ctx.fillRect(x - barWidth/2, y - 45, healthWidth, barHeight);
  }
}

// === BASE ===
class Base {
  constructor(x, side) {
    this.x = x;
    this.y = GROUND_Y - 40;
    this.side = side;
    this.maxHp = 2000;
    this.hp = 2000;
  }

  takeDamage(damage) {
    this.hp -= damage;
  }

  draw(ctx, camera) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    
    if (screenX < -100 || screenX > CANVAS_WIDTH + 100) return;
    
    const color = this.side === 'left' ? '#0044AA' : '#AA0000';
    
    // Main tower
    ctx.fillStyle = color;
    ctx.fillRect(screenX - 30, screenY - 80, 60, 80);
    
    // Roof
    ctx.fillStyle = this.side === 'left' ? '#0066FF' : '#FF4444';
    ctx.beginPath();
    ctx.moveTo(screenX - 35, screenY - 80);
    ctx.lineTo(screenX, screenY - 110);
    ctx.lineTo(screenX + 35, screenY - 80);
    ctx.closePath();
    ctx.fill();
    
    // Flag
    ctx.fillStyle = this.side === 'left' ? '#0088FF' : '#FF6666';
    ctx.fillRect(screenX - 2, screenY - 130, 20, 15);
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - 110);
    ctx.lineTo(screenX, screenY - 130);
    ctx.stroke();
    
    // Health bar
    const barWidth = 80;
    const barHeight = 6;
    ctx.fillStyle = '#000';
    ctx.fillRect(screenX - barWidth/2, screenY - 150, barWidth, barHeight);
    
    ctx.fillStyle = this.hp > this.maxHp * 0.3 ? '#00FF00' : '#FF0000';
    const healthWidth = (this.hp / this.maxHp) * barWidth;
    ctx.fillRect(screenX - barWidth/2, screenY - 150, healthWidth, barHeight);
  }
}

// === MAIN GAME COMPONENT ===
export default function GameEngine() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('playing'); // 'playing', 'won', 'lost'
  const [resources, setResources] = useState(500);
  const [selectedUnit, setSelectedUnit] = useState('swordsman');
  
  // Game objects
  const leftUnits = useRef([]);
  const rightUnits = useRef([]);
  const projectiles = useRef([]);
  const camera = useRef({ x: 0, y: 0 });
  const keys = useRef({});
  
  const bases = useRef({
    left: new Base(100, 'left'),
    right: new Base(WORLD_WIDTH - 100, 'right')
  });
  
  const terrain = useRef({
    mountains: TerrainGenerator.generateMountains(),
    trees: TerrainGenerator.generateTrees()
  });
  
  // AI spawn timer
  const lastAISpawn = useRef(performance.now());
  const resourceTimer = useRef(performance.now());

  // Unit costs
  const unitCosts = {
    swordsman: 50,
    archer: 75,
    spearman: 60,
    knight: 150,
    mage: 200,
    catapult: 300
  };

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.key] = true;
    };
    
    const handleKeyUp = (e) => {
      keys.current[e.key] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const spawnUnit = useCallback((side, type) => {
    const cost = unitCosts[type];
    if (side === 'left' && resources < cost) return;
    
    if (side === 'left') {
      setResources(prev => prev - cost);
    }
    
    const x = side === 'left' ? 150 : WORLD_WIDTH - 150;
    const unit = new Unit(x, side, type);
    
    if (side === 'left') {
      leftUnits.current.push(unit);
    } else {
      rightUnits.current.push(unit);
    }
  }, [resources]);

  const restartGame = useCallback(() => {
    leftUnits.current = [];
    rightUnits.current = [];
    projectiles.current = [];
    bases.current.left.hp = 2000;
    bases.current.right.hp = 2000;
    setResources(500);
    setGameState('playing');
    camera.current = { x: 0, y: 0 };
  }, []);

  // Game loop
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      // Update camera
      const cameraSpeed = 5;
      if (keys.current['ArrowLeft'] || keys.current['a']) {
        camera.current.x = Math.max(0, camera.current.x - cameraSpeed);
      }
      if (keys.current['ArrowRight'] || keys.current['d']) {
        camera.current.x = Math.min(WORLD_WIDTH - CANVAS_WIDTH, camera.current.x + cameraSpeed);
      }
      
      // Resource generation
      if (performance.now() - resourceTimer.current > 1000) {
        setResources(prev => prev + 10);
        resourceTimer.current = performance.now();
      }
      
      // AI spawning
      if (performance.now() - lastAISpawn.current > 3000) {
        const unitTypes = ['swordsman', 'archer', 'spearman', 'knight'];
        const randomType = unitTypes[Math.floor(Math.random() * unitTypes.length)];
        spawnUnit('right', randomType);
        lastAISpawn.current = performance.now();
      }
      
      // Update game objects
      if (gameState === 'playing') {
        leftUnits.current.forEach(unit => 
          unit.update(rightUnits.current, bases.current.right, projectiles.current)
        );
        rightUnits.current.forEach(unit => 
          unit.update(leftUnits.current, bases.current.left, projectiles.current)
        );
        
        projectiles.current.forEach(proj => {
          proj.update();
          proj.checkCollision(
            proj.side === 'left' ? rightUnits.current : leftUnits.current,
            proj.side === 'left' ? [bases.current.right] : [bases.current.left]
          );
        });
        
        // Cleanup
        leftUnits.current = leftUnits.current.filter(unit => unit.hp > 0);
        rightUnits.current = rightUnits.current.filter(unit => unit.hp > 0);
        projectiles.current = projectiles.current.filter(proj => proj.active);
        
        // Check win conditions
        if (bases.current.left.hp <= 0) {
          setGameState('lost');
        } else if (bases.current.right.hp <= 0) {
          setGameState('won');
        }
      }
      
      // Render
      TerrainGenerator.drawTerrain(ctx, camera.current, terrain.current.mountains, terrain.current.trees);
      
      bases.current.left.draw(ctx, camera.current);
      bases.current.right.draw(ctx, camera.current);
      
      leftUnits.current.forEach(unit => unit.draw(ctx, camera.current));
      rightUnits.current.forEach(unit => unit.draw(ctx, camera.current));
      projectiles.current.forEach(proj => proj.draw(ctx, camera.current));
      
      requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
  }, [gameState, spawnUnit]);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ 
          border: '3px solid #333', 
          display: 'block',
          background: '#87CEEB'
        }}
      />
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '10px',
        background: '#f0f0f0',
        borderLeft: '3px solid #333',
        borderRight: '3px solid #333',
        borderBottom: '3px solid #333'
      }}>
        <div>
          <strong>Resources: {resources} gold</strong> | 
          <strong> Your Base: {Math.max(0, bases.current?.left?.hp || 0)} HP</strong> | 
          <strong> Enemy Base: {Math.max(0, bases.current?.right?.hp || 0)} HP</strong>
        </div>
        
        <div>
          <button 
            onClick={restartGame}
            style={{
              padding: '8px 16px',
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔄 Restart Game
          </button>
        </div>
      </div>
      
      <div style={{ 
        padding: '10px',
        background: '#e0e0e0',
        borderLeft: '3px solid #333',
        borderRight: '3px solid #333',
        borderBottom: '3px solid #333'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Unit Selection:</strong>
          <select 
            value={selectedUnit} 
            onChange={(e) => setSelectedUnit(e.target.value)}
            style={{ marginLeft: '10px', padding: '4px' }}
          >
            <option value="swordsman">⚔️ Swordsman (50g)</option>
            <option value="archer">🏹 Archer (75g)</option>
            <option value="spearman">🔱 Spearman (60g)</option>
            <option value="knight">🛡️ Knight (150g)</option>
            <option value="mage">🔮 Mage (200g)</option>
            <option value="catapult">🏰 Catapult (300g)</option>
          </select>
          
          <button 
            onClick={() => spawnUnit('left', selectedUnit)}
            disabled={resources < unitCosts[selectedUnit] || gameState !== 'playing'}
            style={{
              marginLeft: '10px',
              padding: '8px 16px',
              background: resources >= unitCosts[selectedUnit] && gameState === 'playing' ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: resources >= unitCosts[selectedUnit] && gameState === 'playing' ? 'pointer' : 'not-allowed'
            }}
          >
            Spawn Unit
          </button>
        </div>
        
        <div style={{ fontSize: '14px', color: '#666' }}>
          <strong>Controls:</strong> Use Arrow Keys or WASD to move camera around the battlefield
        </div>
      </div>
      
      {gameState !== 'playing' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '30px',
          borderRadius: '10px',
          textAlign: 'center',
          fontSize: '24px'
        }}>
          <h2>{gameState === 'won' ? '🎉 Victory!' : '💀 Defeat!'}</h2>
          <p>{gameState === 'won' ? 'You destroyed the enemy base!' : 'Your base was destroyed!'}</p>
          <button 
            onClick={restartGame}
            style={{
              padding: '10px 20px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              marginTop: '10px'
            }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}