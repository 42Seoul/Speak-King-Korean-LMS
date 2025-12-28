"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Volume2, Sparkles } from "lucide-react"

export function TtsTester() {
  const [text, setText] = useState("안녕하세요. 새로운 TTS 시스템 테스트입니다.")
  const [loading, setLoading] = useState(false)

  // Helper: Add WAV Header to Raw PCM (Copy-pasted for isolation)
  const addWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1) => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); }
    }
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);
    const wavBuffer = new Uint8Array(header.byteLength + pcmData.length);
    wavBuffer.set(new Uint8Array(header), 0);
    wavBuffer.set(pcmData, header.byteLength);
    return wavBuffer;
  }

  const handleTest = async () => {
    if (!text.trim()) return
    try {
      setLoading(true)
      const res = await fetch('/api/tts-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: "Kore" })
      })

      const data = await res.json()
      if (data.audioData) {
        // Decode Base64 to Raw PCM
        const byteCharacters = atob(data.audioData)
        const pcmData = new Uint8Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          pcmData[i] = byteCharacters.charCodeAt(i)
        }

        // Add WAV Header
        const wavData = addWavHeader(pcmData, 24000, 1);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.play()
        audio.onended = () => URL.revokeObjectURL(url)
      } else {
        alert("에러: " + (data.error || "알 수 없는 오류"))
      }
    } catch (error: any) {
      alert("연결 실패: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50 mb-6">
      <CardContent className="pt-6 flex items-center gap-4">
        <div className="flex-1 space-y-1">
          <Label className="text-blue-700 flex items-center gap-2">
            <Sparkles className="h-3 w-3" /> Quick TTS Test (Gemini 2.5)
          </Label>
          <Input 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            className="bg-white border-blue-200 focus-visible:ring-blue-400"
            placeholder="Enter text to hear audio..."
          />
        </div>
        <Button 
          onClick={handleTest} 
          disabled={loading} 
          className="mt-5 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Volume2 className="mr-2 h-4 w-4" />}
          Play Sound
        </Button>
      </CardContent>
    </Card>
  )
}
