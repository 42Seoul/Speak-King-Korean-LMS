"use client"

import React, { useState, FormEvent, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Folder, Download, Play, X, Globe, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { createClient } from "@/lib/supabase/client"

const API_BASE_URL = '/api/python'

// ============== 애니메이션 테스트 컴포넌트 ==============
const SpriteAnimator = ({ imageUrl, nickname }: { imageUrl: string, nickname: string }) => {
  const FRAME_WIDTH = 48;
  const FRAME_HEIGHT = 64;
  const SHEET_FRAMES_PER_ROW = 7;

  const animations = {
    down: [0, 1, 2, 3, 4],
    left: [5, 6, 7, 8, 9],
    right: [10, 11, 12, 13, 14],
    up: [15, 16, 17, 18, 19],
    jump: [38, 39, 40, 41] // 이 애니메이션은 현재 사용되지 않음
  };

  const [direction, setDirection] = useState<'down' | 'left' | 'right' | 'up'>('down');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pressedKeysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (isRunning) {
      animationIntervalRef.current = setInterval(() => {
        setCurrentFrame(prevFrame => (prevFrame + 1) % animations[direction].length);
      }, 150);
    }
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [isRunning, direction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap = { ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up' };
      const newDirection = keyMap[e.key as keyof typeof keyMap];
      
      if (newDirection) {
        // 방향키 입력 시 브라우저 스크롤 방지
        e.preventDefault();
        
        if (!pressedKeysRef.current[e.key]) {
          pressedKeysRef.current[e.key] = true;
          setDirection(newDirection);
          setCurrentFrame(0);
          setIsRunning(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (pressedKeysRef.current[e.key]) {
        pressedKeysRef.current[e.key] = false;
        const stillRunning = Object.values(pressedKeysRef.current).some(val => val);
        if (!stillRunning) {
          setIsRunning(false);
          setCurrentFrame(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    };
  }, []);

  const animationSequence = animations[direction];
  const globalFrameIndex = animationSequence[currentFrame];
  const xPos = -(globalFrameIndex % SHEET_FRAMES_PER_ROW) * FRAME_WIDTH;
  const yPos = -Math.floor(globalFrameIndex / SHEET_FRAMES_PER_ROW) * FRAME_HEIGHT;

  return (
    <Card className="mt-8 text-center p-6 border-primary-foreground">
      <CardHeader>
        <CardTitle>🕹️ Animation Test 🕹️</CardTitle>
        <CardDescription>Press the arrow keys on your keyboard to move the character.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="inline-block border p-5">
          <div
            style={{
              width: `${FRAME_WIDTH}px`,
              height: `${FRAME_HEIGHT}px`,
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: `${xPos}px ${yPos}px`,
              transform: 'scale(2.5)',
              transformOrigin: 'center',
              imageRendering: 'pixelated',
            }}
          ></div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="icon"><ArrowUp className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon"><ArrowDown className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon"><ArrowRight className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============== 스프라이트 생성 페이지 ==============
export default function SpriteCreatorPage() {
  const [nickname, setNickname] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [existingSpriteUrl, setExistingSpriteUrl] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState<boolean>(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('👤 Fetching profile for user:', user.id);
          const { data, error } = await supabase
            .from('profiles')
            .select('sprite_url, nickname')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('❌ Profile fetch error:', error);
            return;
          }

          console.log('📦 Profile data:', data);

          if (data?.sprite_url) {
            console.log('🎨 Loading sprite from URL:', data.sprite_url);
            setExistingSpriteUrl(data.sprite_url);
            setGeneratedImageUrl(data.sprite_url); // 초기 로드 시 바로 애니메이션 표시
            if (data.nickname) setNickname(data.nickname);
          } else {
            console.log('ℹ️ No sprite_url found in profile');
          }
        }
      } catch (e) {
        console.error("Error checking profile:", e);
      } finally {
        setIsCheckingProfile(false);
      }
    };
    fetchProfile();
  }, [supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!file || !nickname) {
      toast.error('Please select both a nickname and an image file.');
      return;
    }

    if (existingSpriteUrl) {
      setShowWarning(true);
    } else {
      processGeneration();
    }
  };

  const processGeneration = async () => {
    setShowWarning(false);
    if (generatedImageUrl && !generatedImageUrl.startsWith('http')) URL.revokeObjectURL(generatedImageUrl);

    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);

    // Get user ID first
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Please log in to create sprites.');
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('user_id', user.id); // Add user_id for backend
    formData.append('nickname', nickname);
    // file is definitely not null here because of check in handleFormSubmit
    if (file) formData.append('file', file);

    // 기존 이미지가 있다면 삭제를 위해 함께 전송
    if (existingSpriteUrl) {
      formData.append('old_sprite_url', existingSpriteUrl);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/create-sprite`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.detail);
      }

      const data = await response.json();
      console.log("📦 Backend response:", data);

      // 서버가 Supabase URL(절대 경로)을 반환하면 그대로 사용, 아니면 로컬 프록시 경로 사용
      const targetSpriteUrl = data.url.startsWith('http')
        ? data.url
        : `${API_BASE_URL}${data.url}`;

      console.log("🎯 Sprite URL to save:", targetSpriteUrl);
      console.log("📝 Nickname to save:", nickname);
      setGeneratedImageUrl(targetSpriteUrl);

      // Supabase 프로필에 스프라이트 URL 저장

      if (user) {
        console.log("💾 Updating profile for user:", user.id);
        console.log("💾 Data to update:", { sprite_url: targetSpriteUrl, nickname: nickname });

        const { data: updatedData, error: updateError } = await supabase
          .from('profiles')
          .update({ sprite_url: targetSpriteUrl, nickname: nickname }) // 닉네임도 함께 업데이트
          .eq('id', user.id)
          .select();

        if (updateError) {
          console.error("❌ Profile update failed:", updateError);
          toast.error(`Profile save failed: ${updateError.message}`);
        } else {
          console.log("✅ Profile update success:", updatedData);
          setExistingSpriteUrl(targetSpriteUrl);
          toast.success("Sprite applied to profile!");
        }
      } else {
        console.warn("⚠️ No logged-in user.");
      }

      toast.success('SUCCESS!!');
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      toast.error(`Sorry... ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create Your Own ZEP Sprite</h1>
        <p className="text-muted-foreground mt-2">
          Upload a photo to create your own character and test the animation.
        </p>
      </div>
      
      <Card className="p-6">
        <CardHeader>
          <CardTitle>Create Character</CardTitle>
          <CardDescription>Upload a nickname and image to create a sprite.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Filename to save (e.g., my_character)"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file" className={existingSpriteUrl ? "text-blue-600 font-bold" : ""}>
                {existingSpriteUrl ? "Create New Character" : "Character Image (Select only when creating new)"}
              </Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className={`flex-1 ${existingSpriteUrl ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI is drawing... Please wait...</>
                ) : (
                  'Create'
                )}
              </Button>
              <Button 
                type="button" 
                asChild
                variant="secondary"
                className="flex-1"
              >
                <Link href="/world">
                  <Globe className="mr-2 h-4 w-4" /> Go to World
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={isCheckingProfile}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              Checking Profile...
            </AlertDialogTitle>
            <AlertDialogDescription>
              We are checking if you have an existing character sprite. Please wait a moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Warning ⚠️</AlertDialogTitle>
            <AlertDialogDescription>
              Existing avatar will be deleted! Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={processGeneration}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {generatedImageUrl && <SpriteAnimator imageUrl={generatedImageUrl} nickname={nickname} />}
    </div>
  );
}
