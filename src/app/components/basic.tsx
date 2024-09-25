import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { GoogleGenerativeAI } from '@google/generative-ai'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

let quantity = 1

const games = [
  {
    name: 'LotoFacil',
    jogosPorCartao: 3,
    mensagem:
      `Please analyze these ${quantity} photos I will send. Each photo contains 3 lottery games with 15 numbers per game. I need you to return a JSON object where each key represents a game, and the value is an array of 15 numbers from that game. Start by reading the first photo, separating its 3 games as \`game1\`, \`game2\`, and \`game3\`. Then, read the second photo, where the games will be named \`game4\`, \`game5\`, and \`game6\`. The result should include all 6 games, structured like this:\n\n` +
      `{
  "game1": [number1, number2, number3, number4, number5, number6, number7, number8, number9, number10, number11, number12, number13, number14, number15],
  "game2": [number1, number2, number3, number4, number5, number6, number7, number8, number9, number10, number11, number12, number13, number14, number15],
  "game3": [number1, number2, number3, number4, number5, number6, number7, number8, number9, number10, number11, number12, number13, number14, number15],
}`,
  },
  {
    name: 'MegaSena',
    jogosPorCartao: 3,
    mensagem:
      `Please analyze these ${quantity} photos I will send. Each photo contains 3 lottery games with 6 numbers per game. I need you to return a JSON object where each key represents a game, and the value is an array of 15 numbers from that game. Start by reading the first photo, separating its 3 games as \`game1\`, \`game2\`, and \`game3\`. Then, read the second photo, where the games will be named \`game4\`, \`game5\`, and \`game6\`. The result should include all ${quantity * 3} games, structured like this:\n\n` +
      `{
  "game1": [number1, number2, number3, number4, number5, number6],
  "game2": [number1, number2, number3, number4, number5, number6],
  "game3": [number1, number2, number3, number4, number5, number6],
}`,
  },
]

// Função para converter arquivo em base64 utilizando o FileReader
function fileToBase64(
  file: File,
): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const base64Data = reader.result as string
      const base64 = base64Data.split(',')[1]
      resolve({
        inlineData: {
          data: base64,
          mimeType: file.type,
        },
      })
    }
    reader.onerror = (error) => reject(error)
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateExcel(data: any) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Loteria')

  // Descobre o maior número de elementos em um jogo
  const maxNumbers = Math.max(
    ...(Object.values(data) as number[][]).map((numbers) => numbers.length),
  )

  const columns = [
    { header: 'Jogo', key: 'game', width: 10 },
    ...Array.from({ length: maxNumbers }, (_, i) => ({
      header: `${i + 1}º Número`,
      key: `num${i + 1}`,
      width: 15,
    })),
  ]

  worksheet.columns = columns

  Object.keys(data).forEach((key, index) => {
    const numbers = data[key]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: { [key: string]: any } = {
      game: index + 1,
    }

    // Preenche dinamicamente cada número na linha
    numbers.forEach((num: number, i: number) => {
      row[`num${i + 1}`] = num
    })

    worksheet.addRow(row)
  })

  // Gera o arquivo e baixa
  workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    saveAs(blob, 'loteria.xlsx')
  })
}

const Basic: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [selectedGame, setSelectedGame] = useState(games[0])

  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
    multiple: true,
    accept: {
      'image/*': ['.png', '.gif', '.jpeg', '.jpg'],
    },
  })

  const files = acceptedFiles.map((file) => (
    <li key={file.name} className="border-t border-1 border-solid border-black">
      {file.name} - {file.size} bytes
    </li>
  ))

  async function processFiles() {
    setLoading(true)
    try {
      const prompt = selectedGame.mensagem ?? games[0].mensagem
      quantity = files.length
      console.log(prompt)
      // Converte todos os arquivos para base64
      const imageParts = await Promise.all(
        acceptedFiles.map((file) => fileToBase64(file)),
      )

      // Faz a requisição ao modelo com o prompt e os arquivos convertidos
      const result = await model.generateContent([prompt, ...imageParts])
      if (result.response && result.response.candidates) {
        const jsonText = result.response.text() as string
        const jsonString = jsonText
          .replace(/```\w*\n/g, '')
          .replace(/\n```/g, '')
          .trim()
        console.log(jsonString)
        const jsonObject = JSON.parse(jsonString)
        console.log(jsonObject)
        generateExcel(jsonObject)
      }
    } catch (error) {
      console.error('Erro ao processar os arquivos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const gameName = e.target.value
    const selectedGame = games.find((game) => game.name === gameName)
    setSelectedGame(selectedGame || games[0]) // Pode definir um valor padrão ou lidar com undefined/null se necessário
  }

  return (
    <section className="flex flex-col items-center p-2">
      <div>
        <select
          value={selectedGame.name}
          onChange={handleChange}
          className="mb-4 p-2 border rounded"
        >
          {games.map((game, index) => (
            <option key={index} value={game.name}>
              {game.name}
            </option>
          ))}
        </select>
      </div>
      <div
        {...getRootProps({ className: 'dropzone' })}
        className="p-6 border-dashed text-center flex items-center justify-center border-black border-4 w-7/12 h-40 bg-slate-50"
      >
        <input {...getInputProps()} />
        <p>
          Arraste e solte várias imagens aqui ou clique para selecionar arquivos
        </p>
      </div>
      <aside className="p-2 flex flex-col items-center">
        <div className="border-2 border-solid border-black">
          <h4 className="p-4 flex justify-center items-center text-md bg-slate-300 w-full">
            Lista de Arquivos
          </h4>
          <ul className="flex flex-col items-center">
            {files.length > 0 ? (
              files
            ) : (
              <li className="border-t border-1 border-solid border-black w-full text-center">
                Nenhum arquivo
              </li>
            )}
          </ul>
        </div>
        <button
          onClick={processFiles}
          disabled={loading}
          className="mt-8 bg-blue-400 p-2 rounded-lg"
        >
          {loading ? 'Processando...' : 'Processar Imagens'}
        </button>
      </aside>
    </section>
  )
}

export default Basic
