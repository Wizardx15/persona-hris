declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf'
  
  interface AutoTableOptions {
    head?: any[]
    body?: any[]
    startY?: number
    styles?: {
      fontSize?: number
      [key: string]: any
    }
    headStyles?: {
      fillColor?: number[]
      [key: string]: any
    }
    [key: string]: any
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void
  
  export default autoTable
}