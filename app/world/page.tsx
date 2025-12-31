"use client"

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Upload, Map as MapIcon, User as UserIcon, Gamepad2, ArrowLeft, Trash2 } from "lucide-react"
import { toast } from "sonner"

// ============== 상수 정의 ==============
const FRAME_WIDTH = 48;
const FRAME_HEIGHT = 64;
const SHEET_FRAMES_PER_ROW = 7;

// 애니메이션 프레임 정의
const ANIMATIONS = {
  idle: {
    down: [0],
    left: [5],
    right: [10],
    up: [15],
  },
  walk: {
    down: [0, 1, 2, 3, 4],
    left: [5, 6, 7, 8, 9],
    right: [10, 11, 12, 13, 14],
    up: [15, 16, 17, 18, 19],
  },
  jump: {
    down: [38],
    left: [39],
    right: [40],
    up: [41],
  },
  dance: {
    down: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
    left: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
    right: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
    up: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
  }
};

const API_BASE_URL = '/api/python';

export default function WorldPage() {
  const [mapImage, setMapImage] = useState<string | null>('/town.png'); 
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [spriteName, setSpriteName] = useState<string>('Player');
  const [user, setUser] = useState<any>(null);
  const [danceTrigger, setDanceTrigger] = useState<number>(0);
  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {
    // 유저 데이터 및 프로필 가져오기
    const checkUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      console.log('👤 World: Fetching profile for user:', user.id);

      // 프로필 조회
      const { data: profile, error } = await (supabase
        .from('profiles') as any)
        .select('sprite_url, nickname')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ World: Profile fetch error:', error);
        toast.warning("Error loading profile");
        return;
      }

      console.log('📦 World: Profile data:', profile);

      if (!profile || !profile.sprite_url) {
        console.log('⚠️ World: No sprite_url found');
        toast.warning("Please create a sprite first!");
        router.push('/sprite-maker');
        return;
      }

      // 프로필에 저장된 스프라이트 설정
      console.log('🎨 World: Loading sprite from URL:', profile.sprite_url);
      setCharacterImage(profile.sprite_url);
      setSpriteName(profile.nickname || 'Player');
    };

    checkUserAndProfile();
  }, [router, supabase]);

  const handleDanceClick = () => {
    setDanceTrigger(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-gray-100 font-sans overscroll-none touch-none">
      {/* 맵 레이어 */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 transition-all duration-300"
        style={{ 
          backgroundImage: mapImage ? `url(${mapImage})` : 'none',
          backgroundColor: mapImage ? 'transparent' : '#f0f2f5' 
        }}
      >
        {!mapImage && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground select-none">
            <MapIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl mb-2 font-medium">Loading map...</p>
          </div>
        )}
      </div>

      {/* 게임 캔버스 */}
      <GameCanvas 
        characterImage={characterImage} 
        spriteName={spriteName}
        mapImage={mapImage} 
        danceTrigger={danceTrigger}
        onDance={handleDanceClick}
      />

      {/* UI 컨트롤 패널 */}
      <Card className="absolute top-4 left-4 z-50 w-64 shadow-xl backdrop-blur-sm bg-background/95 border-border/50 hidden lg:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" /> World Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
              <UserIcon className="w-3 h-3" /> My Character
            </Label>
            <p className="text-sm font-medium px-2 py-1 bg-muted rounded-md">{spriteName}</p>
          </div>
          
          <div className="bg-muted p-3 rounded-md border text-xs text-muted-foreground space-y-2">
            <p className="font-semibold flex items-center gap-1">
              <Gamepad2 className="w-3 h-3" /> Controls
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <span className="font-mono bg-background px-1 rounded border">⬆️⬇️⬅️➡️</span> <span>Move</span>
              <span className="font-mono bg-background px-1 rounded border">Space</span> <span>Jump</span>
              <span className="font-mono bg-background px-1 rounded border">Z</span> <span>Dance</span>
            </div>
            <Button onClick={handleDanceClick} className="w-full mt-2" size="sm" variant="outline">
               💃 Dance Button
            </Button>
          </div>

          <div className="pt-2 border-t text-center">
            <Link href="/sprite-maker">
              <Button variant="link" className="text-primary h-auto p-0 text-xs">
                <ArrowLeft className="mr-1 h-3 w-3" /> Edit Sprite
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------
// 가상 조이스틱 컴포넌트
// ----------------------------------------------------------------------
const VirtualJoystick = ({ onMove, onStop }: { onMove: (x: number, y: number) => void, onStop: () => void }) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const touchId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const maxRadius = 40; // 조이스틱 이동 반경

  const handleStart = (clientX: number, clientY: number, id: number) => {
    if (touchId.current !== null) return;
    
    if (joystickRef.current) {
        const rect = joystickRef.current.getBoundingClientRect();
        center.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }
    
    touchId.current = id;
    setIsActive(true);
    handleMove(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    const dx = clientX - center.current.x;
    const dy = clientY - center.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let moveX = dx;
    let moveY = dy;

    if (distance > maxRadius) {
        const angle = Math.atan2(dy, dx);
        moveX = Math.cos(angle) * maxRadius;
        moveY = Math.sin(angle) * maxRadius;
    }

    setPosition({ x: moveX, y: moveY });

    // 정규화된 값 전달 (-1 ~ 1)
    onMove(moveX / maxRadius, moveY / maxRadius);
  };

  const handleEnd = () => {
    touchId.current = null;
    setIsActive(false);
    setPosition({ x: 0, y: 0 });
    onStop();
  };

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
        // 이미 활성화되어 있으면 무시 (멀티터치 방지)
        // 단, 이 조이스틱 영역 내부에서 시작된 터치인지 확인 필요 -> div의 onTouchStart로 대체
    };

    const onTouchMove = (e: TouchEvent) => {
        if (!isActive) return;
        e.preventDefault(); // 스크롤 방지
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId.current) {
                handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                break;
            }
        }
    };

    const onTouchEnd = (e: TouchEvent) => {
        if (!isActive) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId.current) {
                handleEnd();
                break;
            }
        }
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isActive]);

  return (
    <div 
        ref={joystickRef}
        className="relative w-32 h-32 landscape:w-24 landscape:h-24 rounded-full bg-black/20 backdrop-blur-sm border-2 border-white/30 touch-none flex items-center justify-center"
        onTouchStart={(e) => {
            e.preventDefault(); // 중요: 기본 터치 동작 방지
            handleStart(e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.changedTouches[0].identifier);
        }}
        onMouseDown={(e) => {
            // 마우스 디버깅용
            handleStart(e.clientX, e.clientY, 999);
            const onMouseMove = (ev: MouseEvent) => handleMove(ev.clientX, ev.clientY);
            const onMouseUp = () => {
                handleEnd();
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }}
    >
        {/* 핸들 */}
        <div 
            className="absolute w-12 h-12 rounded-full bg-white shadow-lg transition-transform duration-75 ease-out pointer-events-none"
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px)`,
                boxShadow: isActive ? '0 0 0 4px rgba(255,255,255,0.3)' : 'none'
            }}
        />
    </div>
  );
};

// ----------------------------------------------------------------------
// 게임 로직 및 렌더링 (Canvas) - 조이스틱 적용
// ----------------------------------------------------------------------
const GameCanvas = ({ 
    characterImage, 
    spriteName, 
    mapImage, 
    danceTrigger,
    onDance 
}: { 
    characterImage: string | null, 
    spriteName: string, 
    mapImage: string | null, 
    danceTrigger: number,
    onDance: () => void
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const charImgRef = useRef<HTMLImageElement | null>(null);
  
  // 게임 상태
  const gameState = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
    z: 0,     // 높이
    vz: 0,    // 수직 속도
    direction: 'down' as keyof typeof ANIMATIONS['idle'],
    action: 'idle' as keyof typeof ANIMATIONS,
    frameIndex: 0,
    tick: 0,
    // 조이스틱 입력 상태
    joyActive: false,
    joyX: 0,
    joyY: 0
  });

  const keys = useRef<Record<string, boolean>>({});

  // 댄스 트리거 감지
  useEffect(() => {
    if (danceTrigger > 0) {
      if (gameState.current.action === 'dance') {
        gameState.current.action = 'idle';
      } else {
        gameState.current.action = 'dance';
      }
    }
  }, [danceTrigger]);


  // 이미지 로딩 처리
  useEffect(() => {
    if (!characterImage) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = characterImage;
    
    img.onload = () => {
        charImgRef.current = img;
        setIsImageLoaded(true);
    };
    
    img.onerror = (e) => {
        console.error("Failed to load image:", characterImage, e);
        setIsImageLoaded(false);
    };

  }, [characterImage]);

  useEffect(() => {
    // 키 이벤트 리스너
    const handleDown = (e: KeyboardEvent) => {
      keys.current[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      keys.current[e.key] = false;
      if (e.key === 'z' || e.key === 'Z') {
        if (gameState.current.action === 'dance') {
          gameState.current.action = 'idle';
        }
      }
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    
    const handleResize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
        }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;

    const loop = () => {
      const state = gameState.current;
      const k = keys.current;

      // --- 1. 물리/로직 업데이트 ---
      const speed = 4;
      let isMoving = false;

      // 1-1. 키보드 이동
      if (state.action !== 'dance') {
        if (k['ArrowLeft']) { state.x -= speed; state.direction = 'left'; isMoving = true; }
        if (k['ArrowRight']) { state.x += speed; state.direction = 'right'; isMoving = true; }
        if (k['ArrowUp']) { state.y -= speed; state.direction = 'up'; isMoving = true; }
        if (k['ArrowDown']) { state.y += speed; state.direction = 'down'; isMoving = true; }
      }

      // 1-2. 조이스틱 이동 (키보드 입력 없을 때)
      if (!isMoving && state.joyActive && state.action !== 'dance') {
          // 조이스틱 값은 -1 ~ 1 사이
          state.x += state.joyX * speed;
          state.y += state.joyY * speed;
          isMoving = true;

          // 방향 결정 (절대값이 더 큰 쪽 기준)
          if (Math.abs(state.joyX) > Math.abs(state.joyY)) {
              state.direction = state.joyX > 0 ? 'right' : 'left';
          } else {
              state.direction = state.joyY > 0 ? 'down' : 'up';
          }
      }

      if (k[' '] && state.z === 0) {
        state.vz = 12;
        state.action = 'jump';
      }

      if ((k['z'] || k['Z']) && state.z === 0 && !isMoving) {
        state.action = 'dance';
      } else if (state.action === 'dance' && (isMoving || state.z > 0)) {
        state.action = 'walk'; 
      }

      if (state.z > 0 || state.vz !== 0) {
        state.z += state.vz;
        state.vz -= 0.8;
        if (state.z <= 0) {
          state.z = 0;
          state.vz = 0;
          state.action = isMoving ? 'walk' : 'idle';
        }
      } else {
        if (state.action !== 'dance') {
           state.action = isMoving ? 'walk' : 'idle';
        }
      }
      
      if (state.z > 0) state.action = 'jump';

      const charWidth = FRAME_WIDTH * 2; 
      const charHeight = FRAME_HEIGHT * 2;
      state.x = Math.max(0, Math.min(canvas.width - charWidth, state.x));
      state.y = Math.max(0, Math.min(canvas.height - charHeight, state.y));

      // --- 2. 렌더링 ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isImageLoaded && charImgRef.current) {
        state.tick++;
        const animSpeed = state.action === 'idle' ? 30 : 6;
        
        const currentAnimSet = ANIMATIONS[state.action] || ANIMATIONS['idle'];
        const currentFrames = currentAnimSet[state.direction] || currentAnimSet['down'] || [0];

        if (state.tick % animSpeed === 0) {
            state.frameIndex = (state.frameIndex + 1) % currentFrames.length;
        }
        if (state.frameIndex >= currentFrames.length) state.frameIndex = 0;

        const spriteIdx = currentFrames[state.frameIndex];
        
        const sx = (spriteIdx % SHEET_FRAMES_PER_ROW) * FRAME_WIDTH;
        const sy = Math.floor(spriteIdx / SHEET_FRAMES_PER_ROW) * FRAME_HEIGHT;

        const shadowScale = Math.max(0.5, 1 - state.z / 100);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(
            state.x + FRAME_WIDTH, 
            state.y + FRAME_HEIGHT * 2 - 5, 
            16 * shadowScale, 
            8 * shadowScale,  
            0, 0, Math.PI * 2
        );
        ctx.fill();

        const SCALE = 2;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            charImgRef.current,
            sx, sy, FRAME_WIDTH, FRAME_HEIGHT,
            state.x, state.y - state.z, FRAME_WIDTH * SCALE, FRAME_HEIGHT * SCALE
        );

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.strokeText(spriteName, state.x + FRAME_WIDTH, state.y - state.z - 10);
        ctx.fillText(spriteName, state.x + FRAME_WIDTH, state.y - state.z - 10);

      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(state.x, state.y - state.z, 50, 50);
        ctx.fillStyle = '#000';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Loading...", state.x + 25, state.y - state.z - 10);
      }

      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationId);
  }, [isImageLoaded, spriteName]); 

  // 조이스틱 핸들러
  const handleJoystickMove = (x: number, y: number) => {
    gameState.current.joyActive = true;
    gameState.current.joyX = x;
    gameState.current.joyY = y;
  };

  const handleJoystickStop = () => {
    gameState.current.joyActive = false;
    gameState.current.joyX = 0;
    gameState.current.joyY = 0;
  };

  const handleJumpStart = () => { keys.current[' '] = true; };
  const handleJumpEnd = () => { keys.current[' '] = false; };

  return (
    <div className="absolute inset-0 w-full h-full touch-none overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-full absolute inset-0 z-10" />

        {/* 모바일 전용 컨트롤 (lg 미만에서만 표시 - 가로모드 대응) */}
        <div className="absolute inset-0 z-[200] lg:hidden pointer-events-none">
            
            {/* 왼쪽 하단: 조이스틱 */}
            <div className="absolute bottom-12 left-8 landscape:bottom-4 landscape:left-4 pointer-events-auto">
                <VirtualJoystick 
                    onMove={handleJoystickMove} 
                    onStop={handleJoystickStop} 
                />
            </div>

            {/* 오른쪽 하단: 액션 버튼 */}
            <div className="absolute bottom-12 right-8 landscape:bottom-4 landscape:right-4 pointer-events-auto flex items-end gap-3"
                 onClick={(e) => e.stopPropagation()}
            >
                {/* 댄스 버튼 */}
                <Button 
                    variant="outline"
                    className="w-16 h-16 landscape:w-12 landscape:h-12 rounded-full shadow-xl bg-background/80 backdrop-blur-sm border-2 flex items-center justify-center active:scale-95 transition-all touch-none select-none p-0"
                    onClick={onDance}
                >
                    <span className="text-2xl landscape:text-lg">💃</span>
                </Button>

                {/* 점프 버튼 */}
                <Button 
                    variant="default"
                    className="w-20 h-20 landscape:w-16 landscape:h-16 rounded-full shadow-xl bg-primary/80 border-2 border-white/20 flex items-center justify-center active:scale-95 transition-all touch-none select-none"
                    onMouseDown={handleJumpStart}
                    onMouseUp={handleJumpEnd}
                    onMouseLeave={handleJumpEnd}
                    onTouchStart={handleJumpStart}
                    onTouchEnd={handleJumpEnd}
                >
                    <span className="text-lg font-bold text-white landscape:text-sm">JUMP</span>
                </Button>
            </div>
        </div>
    </div>
  );
};

function World(props: React.ComponentProps<typeof Gamepad2>) {
    return <Gamepad2 {...props} />;
}
