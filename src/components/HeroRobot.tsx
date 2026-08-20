'use client'

import { SplineScene } from '@/components/ui/splite'
import { Spotlight } from '@/components/ui/spotlight'

export function HeroRobot() {
  return (
    <div className="relative w-full h-full min-h-[480px]">
      <Spotlight
        className="-top-20 left-1/4"
        size={320}
        springOptions={{ bounce: 0 }}
      />
      <SplineScene
        scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
        className="w-full h-full"
      />
    </div>
  )
}
