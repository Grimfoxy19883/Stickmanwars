import React, { useRef, useEffect, useState } from 'react';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 400;
const GROUND_Y = 320;

class Unit {
  constructor(x, side, type) {
    this.x = x;
    this.y = GROUND_Y;
    this.side = side; // 'left' | 'right'
    this.type = type; // 'soldier' | 'archer'

    if (type === 'soldier') {
      this.maxHp = 100;
      this.hp = 100;
      this.speed = 1.2;
      this.range = 12;
      this.damage = 12;
      this.cooldown = 500;
    } else if (type === 'archer') {
      this.maxHp = 60;
      this.hp = 60;
      this.speed = 0.7;
      this.range = 120;
      this.damage = 10;
      this.cooldown = 1000;
    }
    this.lastAttack = 0;
  }

  update(enemyUnits, enemyBase) {
    if (this.hp <= 0) return;

    let target = null;
    let minDist = Infinity;

    // Search for closest living enemy unit
    enemyUnits.forEach((e) => {
      if (e.hp <= 0) return;
      const d = Math.abs(e.x - this.x);
      if (d < minDist) {
        minDist = d;
        target = e;
      }
    });

    // Compare distance to base
    const distBase = Math.abs(enemyBase.x - this.x);
    if (!target || distBase < minDist) {
      target = enemyBase;
      minDist = distBase;
    }

    // Attack if in range
    if (minDist <= this.range) {
      if (performance.now() - this.lastAttack >= this.cooldown) {
        target.hp -= this.damage;
        this.lastAttack = performance.now();
      }
    } else {
      // Advance toward enemy base
      this.x += this.speed * (this.side === 'left' ? 1 : -1);
    }
  }

  draw(ctx) {
    if (this.hp <= 0) return;
    ctx.fillStyle = this.side === 'left' ? '#0095ff' : '#ff4141';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // HP bar
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x - 10, this.y - 18, 20, 3);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(this.x - 10, this.y - 18, 20 * Math.max(this.hp, 0) / this.maxHp, 3);
  }
}

class Base {
  constructor(x, side) {
    this.x = x;
    this.y = GROUND_Y - 20;
    this.side = side; // 'left' | 'right'
    this.hp = 1000;
    this.maxHp = 1000;
  }

  draw(ctx) {
    ctx.fillStyle = this.side === 'left' ? '#0066cc' : '#cc2222';
    ctx.fillRect(this.x - 20, this.y - 40, 40, 40);
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x - 25, this.y - 50, 50, 5);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(this.x - 25, this.y - 50, 50 * Math.max(this.hp, 0) / this.maxHp, 5);
  }
}

export default function GameCanvas() {
  const canvasRef = useRef(null);
  const [leftBaseHp, setLeftBaseHp] = useState(1000);
  const [rightBaseHp, setRightBaseHp] = useState(1000);
  const [gameOver, setGameOver] = useState(null); // 'left' | 'right' | null

  const leftUnitsRef = useRef([]);
  const rightUnitsRef = useRef([]);
  const basesRef = useRef({ left: new Base(40, 'left'), right: new Base(CANVAS_WIDTH - 40, 'right') });

  // Spawn right side AI units automatically
  const lastRightSpawnRef = useRef(performance.now());
  const rightSpawnInterval = 2500;

  const spawnUnit = (side, type) => {
    const x = side === 'left' ? 80 : CANVAS_WIDTH - 80;
    if (side === 'left') {
      leftUnitsRef.current.push(new Unit(x, side, type));
    } else {
      rightUnitsRef.current.push(new Unit(x, side, type));
    }
  };

  useEffect(() => {
    // Game loop
    const ctx = canvasRef.current.getContext('2d');

    const loop = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Draw ground
      ctx.fillStyle = '#654321';
      ctx.fillRect(0, GROUND_Y + 8, CANVAS_WIDTH, 4);

      // AI spawn logic
      if (performance.now() - lastRightSpawnRef.current >= rightSpawnInterval) {
        lastRightSpawnRef.current = performance.now();
        const rand = Math.random();
        spawnUnit('right', rand < 0.5 ? 'soldier' : 'archer');
      }

      const { left: leftBase, right: rightBase } = basesRef.current;

      // Update units
      leftUnitsRef.current.forEach((u) => u.update(rightUnitsRef.current, rightBase));
      rightUnitsRef.current.forEach((u) => u.update(leftUnitsRef.current, leftBase));

      // Remove dead units to keep arrays small
      leftUnitsRef.current = leftUnitsRef.current.filter((u) => u.hp > 0);
      rightUnitsRef.current = rightUnitsRef.current.filter((u) => u.hp > 0);

      // Draw bases and units
      leftBase.draw(ctx);
      rightBase.draw(ctx);

      leftUnitsRef.current.forEach((u) => u.draw(ctx));
      rightUnitsRef.current.forEach((u) => u.draw(ctx));

      // Update base HP state for UI
      setLeftBaseHp(leftBase.hp);
      setRightBaseHp(rightBase.hp);

      // Check game over
      if (!gameOver) {
        if (leftBase.hp <= 0) {
          setGameOver('right');
        } else if (rightBase.hp <= 0) {
          setGameOver('left');
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ border: '1px solid #333' }} />
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => spawnUnit('left', 'soldier')}>Spawn Soldier</button>
        <button onClick={() => spawnUnit('left', 'archer')}>Spawn Archer</button>
      </div>
      <div style={{ marginTop: 8 }}>
        <strong>Left Base HP:</strong> {Math.max(0, Math.floor(leftBaseHp))} | <strong>Right Base HP:</strong> {Math.max(0, Math.floor(rightBaseHp))}
      </div>
      {gameOver && (
        <h2 style={{ color: 'purple' }}>{gameOver === 'left' ? 'You Win!' : 'AI Wins!'}</h2>
      )}
    </div>
  );
}
