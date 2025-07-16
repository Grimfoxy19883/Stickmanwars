import React, { useRef, useEffect, useState } from 'react';

// === Constants ===
const CANVAS_WIDTH = 1100;
const CANVAS_HEIGHT = 500;
const GROUND_Y = 380;

// === Projectile (arrows) ===
class Projectile {
  constructor(x, y, dir, side, damage) {
    this.x = x;
    this.y = y;
    this.dir = dir; // 1 (left -> right) or -1 (right -> left)
    this.side = side; // 'left' or 'right'
    this.damage = damage;
    this.speed = 4;
    this.active = true;
  }

  update(enemyUnits, enemyBase) {
    if (!this.active) return;
    this.x += this.speed * this.dir;

    // Collision with units
    const enemies = enemyUnits.filter((u) => u.hp > 0);
    for (const e of enemies) {
      if (Math.abs(e.x - this.x) < 8) {
        e.hp -= this.damage;
        this.active = false;
        return;
      }
    }

    // Collision with base
    if (Math.abs(enemyBase.x - this.x) < 22) {
      enemyBase.hp -= this.damage;
      this.active = false;
      return;
    }

    // Off-screen cleanup
    if (this.x < -10 || this.x > CANVAS_WIDTH + 10) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - 6 * this.dir, this.y);
    ctx.stroke();
  }
}

// === Units ===
class Unit {
  constructor(x, side, type) {
    this.x = x;
    this.y = GROUND_Y;
    this.side = side; // 'left' | 'right'
    this.type = type; // 'soldier' | 'archer'

    if (type === 'soldier') {
      this.maxHp = 120;
      this.hp = 120;
      this.speed = 1.2;
      this.range = 14;
      this.damage = 14;
      this.cooldown = 450;
    } else {
      // archer
      this.maxHp = 70;
      this.hp = 70;
      this.speed = 0.8;
      this.range = 200;
      this.damage = 18;
      this.cooldown = 1000;
    }
    this.lastAttack = 0;
  }

  update(enemyUnits, enemyBase, projectilesArr) {
    if (this.hp <= 0) return;

    let target = null;
    let minDist = Infinity;

    // Closest enemy unit
    for (const e of enemyUnits) {
      if (e.hp <= 0) continue;
      const d = Math.abs(e.x - this.x);
      if (d < minDist) {
        minDist = d;
        target = e;
      }
    }

    // Compare distance to base
    const distBase = Math.abs(enemyBase.x - this.x);
    if (!target || distBase < minDist) {
      target = enemyBase;
      minDist = distBase;
    }

    const now = performance.now();
    if (minDist <= this.range) {
      if (now - this.lastAttack >= this.cooldown) {
        if (this.type === 'archer') {
          // Fire arrow
          const dir = this.side === 'left' ? 1 : -1;
          projectilesArr.push(new Projectile(this.x, this.y - 10, dir, this.side, this.damage));
        } else {
          target.hp -= this.damage;
        }
        this.lastAttack = now;
      }
    } else {
      // Move forward
      this.x += this.speed * (this.side === 'left' ? 1 : -1);
    }
  }

  drawStickman(ctx) {
    ctx.strokeStyle = this.side === 'left' ? '#005eff' : '#ff2b2b';
    ctx.lineWidth = 2;

    // Head
    ctx.beginPath();
    ctx.arc(this.x, this.y - 12, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 6);
    ctx.lineTo(this.x, this.y + 8);
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - 6, this.y - 4);
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + 6, this.y - 4);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + 8);
    ctx.lineTo(this.x - 6, this.y + 18);
    ctx.moveTo(this.x, this.y + 8);
    ctx.lineTo(this.x + 6, this.y + 18);
    ctx.stroke();

    // Weapon
    if (this.type === 'soldier') {
      ctx.strokeStyle = '#8b8b8b';
      ctx.beginPath();
      ctx.moveTo(this.x + (this.side === 'left' ? 10 : -10), this.y - 4);
      ctx.lineTo(this.x + (this.side === 'left' ? 10 : -10), this.y + 10);
      ctx.stroke();
    } else {
      // Bow
      ctx.strokeStyle = '#8b4513';
      ctx.beginPath();
      const bowX = this.x + (this.side === 'left' ? 10 : -10);
      ctx.moveTo(bowX, this.y - 10);
      ctx.lineTo(bowX, this.y + 4);
      ctx.stroke();
    }
  }

  draw(ctx) {
    if (this.hp <= 0) return;
    this.drawStickman(ctx);

    // HP bar
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x - 12, this.y - 26, 24, 4);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(this.x - 12, this.y - 26, 24 * Math.max(this.hp, 0) / this.maxHp, 4);
  }
}

// === Base / Tower ===
class Base {
  constructor(x, side) {
    this.x = x;
    this.y = GROUND_Y - 20;
    this.side = side;
    this.hp = 1200;
    this.maxHp = 1200;
  }

  draw(ctx) {
    // Tower body
    ctx.fillStyle = this.side === 'left' ? '#0040aa' : '#aa0000';
    ctx.fillRect(this.x - 24, this.y - 60, 48, 60);

    // Roof
    ctx.fillStyle = this.side === 'left' ? '#0066ff' : '#ff4444';
    ctx.beginPath();
    ctx.moveTo(this.x - 28, this.y - 60);
    ctx.lineTo(this.x, this.y - 90);
    ctx.lineTo(this.x + 28, this.y - 60);
    ctx.closePath();
    ctx.fill();

    // HP bar
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x - 30, this.y - 100, 60, 6);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(this.x - 30, this.y - 100, 60 * Math.max(this.hp, 0) / this.maxHp, 6);
  }
}

// === Game Component ===
export default function GameCanvasImproved() {
  const canvasRef = useRef(null);
  const [leftHp, setLeftHp] = useState(1200);
  const [rightHp, setRightHp] = useState(1200);
  const [gameOver, setGameOver] = useState(null);

  const leftUnits = useRef([]);
  const rightUnits = useRef([]);
  const projectiles = useRef([]);

  const bases = useRef({
    left: new Base(60, 'left'),
    right: new Base(CANVAS_WIDTH - 60, 'right'),
  });

  // AI spawn control
  const lastAiSpawn = useRef(performance.now());
  const aiInterval = 2200;

  const spawnUnit = (side, type) => {
    const x = side === 'left' ? 120 : CANVAS_WIDTH - 120;
    (side === 'left' ? leftUnits.current : rightUnits.current).push(new Unit(x, side, type));
  };

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');

    const loop = () => {
      // --- Background ---
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, '#87ceeb');
      grad.addColorStop(1, '#e0f7ff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#6a4d31';
      ctx.fillRect(0, GROUND_Y + 12, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y - 12);

      // --- AI Spawn ---
      if (performance.now() - lastAiSpawn.current > aiInterval) {
        lastAiSpawn.current = performance.now();
        spawnUnit('right', Math.random() < 0.5 ? 'soldier' : 'archer');
      }

      const { left: leftBase, right: rightBase } = bases.current;

      // --- Update entities ---
      leftUnits.current.forEach((u) => u.update(rightUnits.current, rightBase, projectiles.current));
      rightUnits.current.forEach((u) => u.update(leftUnits.current, leftBase, projectiles.current));

      projectiles.current.forEach((p) =>
        p.update(p.side === 'left' ? rightUnits.current : leftUnits.current, p.side === 'left' ? rightBase : leftBase)
      );

      // Cleanup
      leftUnits.current = leftUnits.current.filter((u) => u.hp > 0);
      rightUnits.current = rightUnits.current.filter((u) => u.hp > 0);
      projectiles.current = projectiles.current.filter((p) => p.active);

      // --- Draw ---
      leftBase.draw(ctx);
      rightBase.draw(ctx);
      leftUnits.current.forEach((u) => u.draw(ctx));
      rightUnits.current.forEach((u) => u.draw(ctx));
      projectiles.current.forEach((p) => p.draw(ctx));

      // --- UI state ---
      setLeftHp(leftBase.hp);
      setRightHp(rightBase.hp);
      if (!gameOver) {
        if (leftBase.hp <= 0) setGameOver('right');
        else if (rightBase.hp <= 0) setGameOver('left');
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }, [gameOver]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ border: '2px solid #333', background: '#fff' }}
      />
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button onClick={() => spawnUnit('left', 'soldier')}>🗡️ Soldier (Free)</button>
        <button onClick={() => spawnUnit('left', 'archer')}>🏹 Archer (Free)</button>
      </div>
      <div style={{ marginTop: 6 }}>
        <strong>Left Tower:</strong> {Math.max(0, Math.floor(leftHp))} HP |{' '}
        <strong>Right Tower:</strong> {Math.max(0, Math.floor(rightHp))} HP
      </div>
      {gameOver && (
        <h2 style={{ color: gameOver === 'left' ? 'green' : 'red' }}>
          {gameOver === 'left' ? 'You Win!' : 'AI Wins!'}
        </h2>
      )}
    </div>
  );
}
