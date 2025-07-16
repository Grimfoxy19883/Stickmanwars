import React, { useRef, useEffect, useState, useCallback } from 'react';

// === CONSTANTS ===
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 600;
const GROUND_Y = 480;

// === TERRAIN GENERATION ===
class TerrainGenerator {
  static generateMountains() {
    const mountains = [];
    for (let i = 0; i < 12; i++) {
      mountains.push({
        x: (i * WORLD_WIDTH) / 11 + Math.random() * 150,
        height: 80 + Math.random() * 120,
        width: 120 + Math.random() * 80,
        color: i % 2 === 0 ? '#8B7355' : '#A0845C'
      });
    }
    return mountains;
  }

  static generateTrees() {
    const trees = [];
    for (let i = 0; i < 40; i++) {
      trees.push({
        x: Math.random() * WORLD_WIDTH,
        y: GROUND_Y,
        height: 35 + Math.random() * 25,
        width: 15 + Math.random() * 10,
        type: Math.random() > 0.5 ? 'pine' : 'oak'
      });
    }
    return trees;
  }

  static generateClouds() {
    const clouds = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({
        x: Math.random() * WORLD_WIDTH,
        y: 50 + Math.random() * 100,
        size: 30 + Math.random() * 40,
        speed: 0.1 + Math.random() * 0.2
      });
    }
    return clouds;
  }

  static drawTerrain(ctx, camera, mountains, trees, clouds) {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.3, '#B0E0E6');
    gradient.addColorStop(0.7, '#E0F6FF');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Clouds
    clouds.forEach(cloud => {
      const screenX = cloud.x - camera.x * 0.3; // Parallax effect
      if (screenX > -cloud.size && screenX < CANVAS_WIDTH + cloud.size) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(screenX, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.arc(screenX + cloud.size * 0.6, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
        ctx.arc(screenX - cloud.size * 0.6, cloud.y, cloud.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Mountains (with parallax)
    mountains.forEach(mountain => {
      const screenX = mountain.x - camera.x * 0.7;
      if (screenX > -mountain.width && screenX < CANVAS_WIDTH + mountain.width) {
        // Mountain body
        ctx.fillStyle = mountain.color;
        ctx.beginPath();
        ctx.moveTo(screenX - mountain.width/2, GROUND_Y);
        ctx.lineTo(screenX, GROUND_Y - mountain.height);
        ctx.lineTo(screenX + mountain.width/2, GROUND_Y);
        ctx.closePath();
        ctx.fill();

        // Snow cap
        if (mountain.height > 120) {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(screenX - mountain.width/4, GROUND_Y - mountain.height * 0.7);
          ctx.lineTo(screenX, GROUND_Y - mountain.height);
          ctx.lineTo(screenX + mountain.width/4, GROUND_Y - mountain.height * 0.7);
          ctx.closePath();
          ctx.fill();
        }

        // Mountain shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.moveTo(screenX, GROUND_Y - mountain.height);
        ctx.lineTo(screenX + mountain.width/2, GROUND_Y);
        ctx.lineTo(screenX + mountain.width/3, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Ground with texture
    const groundGradient = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
    groundGradient.addColorStop(0, '#8FBC8F');
    groundGradient.addColorStop(0.3, '#7A9A7A');
    groundGradient.addColorStop(1, '#6B8E6B');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Grass texture
    ctx.strokeStyle = '#228B22';
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 5) {
      if (Math.random() > 0.7) {
        ctx.beginPath();
        ctx.moveTo(i, GROUND_Y);
        ctx.lineTo(i + Math.random() * 3 - 1.5, GROUND_Y - Math.random() * 8);
        ctx.stroke();
      }
    }

    // Trees
    trees.forEach(tree => {
      const screenX = tree.x - camera.x;
      if (screenX > -50 && screenX < CANVAS_WIDTH + 50) {
        if (tree.type === 'pine') {
          // Pine tree
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(screenX - 2, tree.y - tree.height/4, 4, tree.height/4);
          
          ctx.fillStyle = '#228B22';
          for (let i = 0; i < 3; i++) {
            const layerY = tree.y - tree.height/4 - i * tree.height/6;
            const layerWidth = tree.width - i * 3;
            ctx.beginPath();
            ctx.moveTo(screenX - layerWidth/2, layerY);
            ctx.lineTo(screenX, layerY - tree.height/3);
            ctx.lineTo(screenX + layerWidth/2, layerY);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          // Oak tree
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(screenX - 3, tree.y - tree.height/3, 6, tree.height/3);
          
          ctx.fillStyle = '#228B22';
          ctx.beginPath();
          ctx.arc(screenX, tree.y - tree.height/2, tree.width, 0, Math.PI * 2);
          ctx.fill();
          
          // Tree highlights
          ctx.fillStyle = '#32CD32';
          ctx.beginPath();
          ctx.arc(screenX - tree.width/3, tree.y - tree.height/2 - tree.width/3, tree.width/2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }
}

// === PROJECTILES ===
class Projectile {
  constructor(x, y, targetX, targetY, damage, speed = 4, type = 'arrow', side = 'left') {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.speed = speed;
    this.type = type;
    this.side = side;
    this.active = true;
    this.gravity = type === 'catapult' ? 0.1 : 0;
    
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
    
    if (type === 'catapult') {
      this.vy -= 2; // Arc trajectory
    }
  }

  update() {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    
    if (this.x < 0 || this.x > WORLD_WIDTH || this.y < 0 || this.y > WORLD_HEIGHT) {
      this.active = false;
    }
  }

  draw(ctx, camera) {
    if (!this.active) return;
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    
    if (screenX < -20 || screenX > CANVAS_WIDTH + 20) return;
    
    ctx.save();
    ctx.translate(screenX, screenY);
    
    if (this.type === 'arrow') {
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-8, 0);
      ctx.stroke();
      
      ctx.fillStyle = '#C0C0C0';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-3, -2);
      ctx.lineTo(-3, 2);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'magic') {
      ctx.fillStyle = '#8A2BE2';
      ctx.shadowColor = '#8A2BE2';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.type === 'catapult') {
      ctx.fillStyle = '#696969';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  checkCollision(units, bases) {
    if (!this.active) return false;
    
    // Check unit collisions
    for (const unit of units) {
      if (unit.hp > 0 && unit.side !== this.side) {
        const dx = unit.x - this.x;
        const dy = unit.y - this.y;
        if (Math.sqrt(dx * dx + dy * dy) < 15) {
          unit.takeDamage(this.damage);
          this.active = false;
          return true;
        }
      }
    }
    
    // Check base collisions
    for (const base of bases) {
      if (base.side !== this.side) {
        const dx = base.x - this.x;
        const dy = base.y - this.y;
        if (Math.sqrt(dx * dx + dy * dy) < 50) {
          base.takeDamage(this.damage);
          this.active = false;
          return true;
        }
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
    this.walkCycle = 0;
    this.isMoving = false;
    
    this.setupStats();
  }

  setupStats() {
    const stats = {
      swordsman: { hp: 100, speed: 0.8, range: 25, damage: 25, cooldown: 800, cost: 50 },
      archer: { hp: 70, speed: 0.6, range: 180, damage: 30, cooldown: 1200, cost: 75 },
      spearman: { hp: 120, speed: 0.9, range: 35, damage: 20, cooldown: 600, cost: 60 },
      knight: { hp: 200, speed: 0.5, range: 30, damage: 40, cooldown: 1000, cost: 150 },
      mage: { hp: 50, speed: 0.7, range: 160, damage: 45, cooldown: 1500, cost: 200 },
      catapult: { hp: 80, speed: 0.3, range: 280, damage: 80, cooldown: 3000, cost: 300 }
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

  update(enemies, enemyBase, projectiles, allUnits) {
    if (this.hp <= 0) return;
    
    this.animFrame += 0.05;
    
    // Find target
    this.target = this.findTarget(enemies, enemyBase);
    
    if (this.target) {
      const dist = Math.abs(this.target.x - this.x);
      
      if (dist <= this.range) {
        this.isMoving = false;
        this.attack(projectiles);
      } else {
        this.isMoving = true;
        this.move();
      }
    }
    
    // Update walk cycle for animation
    if (this.isMoving) {
      this.walkCycle += 0.15;
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
    this.x = Math.max(80, Math.min(WORLD_WIDTH - 80, this.x));
  }

  attack(projectiles) {
    const now = performance.now();
    if (now - this.lastAttack < this.cooldown) return;
    
    if (this.type === 'archer' || this.type === 'mage' || this.type === 'catapult') {
      // Ranged attack
      const projectileType = this.type === 'mage' ? 'magic' : this.type === 'catapult' ? 'catapult' : 'arrow';
      projectiles.push(new Projectile(
        this.x, 
        this.y - 20, 
        this.target.x, 
        this.target.y - 20, 
        this.damage,
        this.type === 'catapult' ? 3 : 5,
        projectileType,
        this.side
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
    
    // Walking animation offsets
    const legOffset = this.isMoving ? Math.sin(this.walkCycle) * 3 : 0;
    const armOffset = this.isMoving ? Math.cos(this.walkCycle) * 2 : 0;
    const bodyBob = this.isMoving ? Math.abs(Math.sin(this.walkCycle)) * 1 : 0;
    
    const headY = y - 40 - bodyBob;
    const bodyTopY = y - 32 - bodyBob;
    const bodyBottomY = y - 8 - bodyBob;
    
    // Head
    ctx.beginPath();
    ctx.arc(x, headY, 6, 0, Math.PI * 2);
    ctx.stroke();
    
    // Body
    ctx.beginPath();
    ctx.moveTo(x, bodyTopY);
    ctx.lineTo(x, bodyBottomY);
    ctx.stroke();
    
    // Arms with animation
    ctx.beginPath();
    ctx.moveTo(x, bodyTopY + 8);
    ctx.lineTo(x - 8 + armOffset, bodyTopY + 15);
    ctx.moveTo(x, bodyTopY + 8);
    ctx.lineTo(x + 8 - armOffset, bodyTopY + 15);
    ctx.stroke();
    
    // Legs with walking animation
    ctx.beginPath();
    ctx.moveTo(x, bodyBottomY);
    ctx.lineTo(x - 6 + legOffset, y + 8);
    ctx.moveTo(x, bodyBottomY);
    ctx.lineTo(x + 6 - legOffset, y + 8);
    ctx.stroke();
    
    // Equipment
    this.drawEquipment(ctx, x, y - bodyBob, color);
  }

  drawEquipment(ctx, x, y, color) {
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    
    switch (this.type) {
      case 'swordsman':
        // Sword
        ctx.beginPath();
        ctx.moveTo(x + 10, y - 30);
        ctx.lineTo(x + 10, y - 15);
        ctx.stroke();
        // Hilt
        ctx.strokeStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.moveTo(x + 8, y - 30);
        ctx.lineTo(x + 12, y - 30);
        ctx.stroke();
        break;
        
      case 'archer':
        // Bow
        ctx.beginPath();
        ctx.arc(x - 10, y - 25, 8, Math.PI * 0.3, Math.PI * 0.7);
        ctx.stroke();
        break;
        
      case 'spearman':
        // Spear
        ctx.beginPath();
        ctx.moveTo(x + 12, y - 35);
        ctx.lineTo(x + 12, y - 10);
        ctx.stroke();
        // Spear tip
        ctx.strokeStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.moveTo(x + 10, y - 37);
        ctx.lineTo(x + 12, y - 40);
        ctx.lineTo(x + 14, y - 37);
        ctx.stroke();
        break;
        
      case 'knight':
        // Shield
        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.arc(x - 10, y - 25, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Helmet
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(x - 8, y - 45, 16, 10);
        break;
        
      case 'mage':
        // Staff
        ctx.strokeStyle = '#8A2BE2';
        ctx.beginPath();
        ctx.moveTo(x + 10, y - 40);
        ctx.lineTo(x + 10, y - 15);
        ctx.stroke();
        // Orb
        ctx.fillStyle = '#8A2BE2';
        ctx.shadowColor = '#8A2BE2';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(x + 10, y - 42, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
        
      case 'catapult':
        // Catapult base
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - 12, y - 15, 24, 10);
        // Arm
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y - 15);
        ctx.lineTo(x - 5, y - 25);
        ctx.stroke();
        break;
    }
  }

  drawHealthBar(ctx, x, y) {
    const barWidth = 24;
    const barHeight = 4;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - barWidth/2, y - 55, barWidth, barHeight);
    
    // Health
    const healthPercent = this.hp / this.maxHp;
    ctx.fillStyle = healthPercent > 0.6 ? '#00FF00' : healthPercent > 0.3 ? '#FFFF00' : '#FF0000';
    ctx.fillRect(x - barWidth/2, y - 55, barWidth * healthPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - barWidth/2, y - 55, barWidth, barHeight);
  }
}

// === BASE ===
class Base {
  constructor(x, side) {
    this.x = x;
    this.y = GROUND_Y - 60;
    this.side = side;
    this.maxHp = 2500;
    this.hp = 2500;
  }

  takeDamage(damage) {
    this.hp -= damage;
  }

  draw(ctx, camera) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    
    if (screenX < -100 || screenX > CANVAS_WIDTH + 100) return;
    
    const color = this.side === 'left' ? '#0044AA' : '#AA0000';
    const lightColor = this.side === 'left' ? '#0066FF' : '#FF4444';
    
    // Base foundation
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(screenX - 40, screenY + 40, 80, 20);
    
    // Main tower
    ctx.fillStyle = color;
    ctx.fillRect(screenX - 35, screenY - 20, 70, 60);
    
    // Tower details
    ctx.fillStyle = lightColor;
    ctx.fillRect(screenX - 30, screenY - 15, 60, 5);
    ctx.fillRect(screenX - 30, screenY + 5, 60, 5);
    ctx.fillRect(screenX - 30, screenY + 25, 60, 5);
    
    // Battlements
    for (let i = 0; i < 5; i++) {
      const battlementX = screenX - 30 + i * 15;
      ctx.fillStyle = color;
      ctx.fillRect(battlementX, screenY - 30, 10, 10);
    }
    
    // Flag pole
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - 30);
    ctx.lineTo(screenX, screenY - 60);
    ctx.stroke();
    
    // Flag
    ctx.fillStyle = lightColor;
    ctx.fillRect(screenX, screenY - 60, 25, 15);
    
    // Castle gate
    ctx.fillStyle = '#654321';
    ctx.fillRect(screenX - 8, screenY + 25, 16, 15);
    
    // Health bar
    const barWidth = 100;
    const barHeight = 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(screenX - barWidth/2, screenY - 80, barWidth, barHeight);
    
    const healthPercent = this.hp / this.maxHp;
    ctx.fillStyle = healthPercent > 0.6 ? '#00FF00' : healthPercent > 0.3 ? '#FFFF00' : '#FF0000';
    ctx.fillRect(screenX - barWidth/2, screenY - 80, barWidth * healthPercent, barHeight);
    
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX - barWidth/2, screenY - 80, barWidth, barHeight);
    
    // HP text
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.max(0, Math.floor(this.hp))} / ${this.maxHp}`, screenX, screenY - 85);
  }
}

// === MAIN GAME COMPONENT ===
export default function GameEngine() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('playing');
  const [resources, setResources] = useState(1000);
  const [selectedUnit, setSelectedUnit] = useState('swordsman');
  
  // Game objects
  const leftUnits = useRef([]);
  const rightUnits = useRef([]);
  const projectiles = useRef([]);
  const camera = useRef({ x: 0, y: 0 });
  const keys = useRef({});
  
  const bases = useRef({
    left: new Base(120, 'left'),
    right: new Base(WORLD_WIDTH - 120, 'right')
  });
  
  const terrain = useRef({
    mountains: TerrainGenerator.generateMountains(),
    trees: TerrainGenerator.generateTrees(),
    clouds: TerrainGenerator.generateClouds()
  });
  
  const lastAISpawn = useRef(performance.now());
  const resourceTimer = useRef(performance.now());

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
    
    const x = side === 'left' ? 180 : WORLD_WIDTH - 180;
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
    bases.current.left.hp = 2500;
    bases.current.right.hp = 2500;
    setResources(1000);
    setGameState('playing');
    camera.current = { x: 0, y: 0 };
    terrain.current = {
      mountains: TerrainGenerator.generateMountains(),
      trees: TerrainGenerator.generateTrees(),
      clouds: TerrainGenerator.generateClouds()
    };
  }, []);

  // Game loop
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      // Update camera
      const cameraSpeed = 8;
      if (keys.current['ArrowLeft'] || keys.current['a'] || keys.current['A']) {
        camera.current.x = Math.max(0, camera.current.x - cameraSpeed);
      }
      if (keys.current['ArrowRight'] || keys.current['d'] || keys.current['D']) {
        camera.current.x = Math.min(WORLD_WIDTH - CANVAS_WIDTH, camera.current.x + cameraSpeed);
      }
      
      // Resource generation (faster)
      if (performance.now() - resourceTimer.current > 500) {
        setResources(prev => prev + 25);
        resourceTimer.current = performance.now();
      }
      
      // AI spawning
      if (performance.now() - lastAISpawn.current > 2500) {
        const unitTypes = ['swordsman', 'archer', 'spearman', 'knight', 'mage'];
        const randomType = unitTypes[Math.floor(Math.random() * unitTypes.length)];
        spawnUnit('right', randomType);
        lastAISpawn.current = performance.now();
      }
      
      // Update clouds
      terrain.current.clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > WORLD_WIDTH + cloud.size) {
          cloud.x = -cloud.size;
        }
      });
      
      // Update game objects
      if (gameState === 'playing') {
        const allUnits = [...leftUnits.current, ...rightUnits.current];
        
        leftUnits.current.forEach(unit => 
          unit.update(rightUnits.current, bases.current.right, projectiles.current, allUnits)
        );
        rightUnits.current.forEach(unit => 
          unit.update(leftUnits.current, bases.current.left, projectiles.current, allUnits)
        );
        
        projectiles.current.forEach(proj => {
          proj.update();
          proj.checkCollision(allUnits, [bases.current.left, bases.current.right]);
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
      TerrainGenerator.drawTerrain(ctx, camera.current, terrain.current.mountains, terrain.current.trees, terrain.current.clouds);
      
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
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
      borderRadius: '15px',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
    }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ 
          display: 'block',
          border: '3px solid #34495e',
          borderRadius: '10px 10px 0 0'
        }}
      />
      
      {/* Game UI */}
      <div style={{ 
        background: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
        color: 'white',
        padding: '15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '2px solid #4a6741'
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
            padding: '8px 15px',
            borderRadius: '20px',
            fontWeight: 'bold',
            boxShadow: '0 3px 10px rgba(0,0,0,0.2)'
          }}>
            💰 {resources} Gold
          </div>
          
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            🏰 Your Base: <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>{Math.max(0, bases.current?.left?.hp || 0)} HP</span>
          </div>
          
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            🏰 Enemy Base: <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{Math.max(0, bases.current?.right?.hp || 0)} HP</span>
          </div>
        </div>
        
        <button 
          onClick={restartGame}
          style={{
            background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          🔄 New Battle
        </button>
      </div>
      
      {/* Unit Spawning UI */}
      <div style={{ 
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        padding: '15px',
        borderTop: '1px solid #4a6741'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ color: 'white', fontWeight: 'bold', marginRight: '10px' }}>
            🎯 Deploy Units:
          </div>
          
          {Object.entries(unitCosts).map(([unitType, cost]) => {
            const canAfford = resources >= cost;
            const icons = {
              swordsman: '⚔️',
              archer: '🏹',
              spearman: '🔱',
              knight: '🛡️',
              mage: '🔮',
              catapult: '🏰'
            };
            
            return (
              <button
                key={unitType}
                onClick={() => spawnUnit('left', unitType)}
                disabled={!canAfford || gameState !== 'playing'}
                style={{
                  background: canAfford && gameState === 'playing' 
                    ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' 
                    : 'linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '20px',
                  cursor: canAfford && gameState === 'playing' ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s',
                  opacity: canAfford && gameState === 'playing' ? 1 : 0.6
                }}
                onMouseOver={(e) => {
                  if (canAfford && gameState === 'playing') {
                    e.target.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                {icons[unitType]} {unitType.charAt(0).toUpperCase() + unitType.slice(1)} ({cost}g)
              </button>
            );
          })}
        </div>
        
        <div style={{ 
          marginTop: '10px', 
          fontSize: '12px', 
          color: '#bdc3c7',
          display: 'flex',
          gap: '20px'
        }}>
          <span>🎮 <strong>Controls:</strong> Arrow Keys or WASD to move camera</span>
          <span>💡 <strong>Tip:</strong> Mix different unit types for better strategy!</span>
        </div>
      </div>
      
      {/* Game Over Screen */}
      {gameState !== 'playing' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(44,62,80,0.95) 100%)',
          color: 'white',
          padding: '40px',
          borderRadius: '20px',
          textAlign: 'center',
          fontSize: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '3px solid ' + (gameState === 'won' ? '#2ecc71' : '#e74c3c')
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>
            {gameState === 'won' ? '🎉' : '💀'}
          </div>
          <h2 style={{ margin: '0 0 15px 0', color: gameState === 'won' ? '#2ecc71' : '#e74c3c' }}>
            {gameState === 'won' ? 'VICTORY!' : 'DEFEAT!'}
          </h2>
          <p style={{ margin: '0 0 25px 0', fontSize: '16px', opacity: 0.9 }}>
            {gameState === 'won' 
              ? 'You have conquered the enemy fortress!' 
              : 'Your fortress has fallen to the enemy!'}
          </p>
          <button 
            onClick={restartGame}
            style={{
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '30px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            ⚔️ Fight Again
          </button>
        </div>
      )}
    </div>
  );
}