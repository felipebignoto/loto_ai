'use client'

import Basic from './components/basic'

export default function Home() {
  return (
    <div className="bg-slate-200 h-screen">
      <h1 className="pt-8 p-4 flex justify-center items-center text-xl bg-slate-300 underline">
        Faça o upload das imagens dos jogos de loteria
      </h1>
      <Basic />
    </div>
  )
}
