import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { GoogleGenerativeAI } from '@google/generative-ai'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

// Função para converter arquivo em base64 utilizando o FileReader
function fileToBase64(
  file: File,
): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file) // Converte o arquivo para base64
    reader.onload = () => {
      const base64Data = reader.result as string
      // Remove o prefixo "data:mimeType;base64," da string gerada pelo FileReader
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

  // Cria as colunas dinamicamente, considerando o número máximo de números por jogo
  const columns = [
    { header: 'Jogo', key: 'game', width: 10 },
    ...Array.from({ length: maxNumbers }, (_, i) => ({
      header: `${i + 1}º Número`,
      key: `num${i + 1}`,
      width: 15,
    })),
  ]

  worksheet.columns = columns

  // Preenche as linhas com os números dos jogos
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
      const prompt =
        'Please analyze the photos I will send. Each photo contains a lottery game with 6 or 15 numbers. I need you to return a JSON object where each key represents a game, and the value is an array of the 6 numbers from that game. For example:\n\n' +
        '{\n' +
        '  "game1": [number1, number2, number3, number4, number5, number6],\n' +
        '  "game2": [number1, number2, number3, number4, number5, number6],\n' +
        '  ...\n' +
        '}'

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
        const jsonObject = JSON.parse(jsonString)
        generateExcel(jsonObject)
      }
    } catch (error) {
      console.error('Erro ao processar os arquivos:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex flex-col items-center p-2">
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
