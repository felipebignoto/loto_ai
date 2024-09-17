import React from 'react'
import { useDropzone } from 'react-dropzone'

function Basic() {
  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
    multiple: true,
    accept: {
      'image/*': ['.png', '.gif', '.jpeg', '.jpg'],
    },
  })

  const files = acceptedFiles.map((file) => (
    <li key={file.name}>
      {file.name} - {file.size} bytes
    </li>
  ))

  const processFiles = () => {
    acceptedFiles.forEach((file) => {
      console.log(`Processando arquivo: ${file.name}`)
      // Implementar a lógica de leitura aqui (usando Tesseract.js, por exemplo)
    })
  }

  return (
    <section className="container">
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p>Drag n drop some files here, or click to select files</p>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>{files}</ul>
        <button onClick={processFiles}>Processar Imagens</button>{' '}
        {/* Botão para iniciar o processamento */}
      </aside>
    </section>
  )
}

export default Basic
