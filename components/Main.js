'use client'

import { selectionsFromQuoteAndString } from '@texttree/tn-quote/dist/utils/srrcl'
import axios from 'axios'
import { useEffect, useState } from 'react'
import {
  getParsedUSFM,
  getQuoteMatchesInBookRef,
  setBook,
  verseObjectsToString,
} from 'uw-quote-helpers'
import helper from '../helper'

function Main() {
  const [gl, setGl] = useState(
    'https://git.door43.org/unfoldingWord/en_ult/raw/branch/master/33-MIC.usfm'
  )
  const [ol, setOl] = useState(
    'https://git.door43.org/unfoldingWord/hbo_uhb/raw/branch/master/33-MIC.usfm'
  )
  const [tn, setTn] = useState(
    'https://git.door43.org/unfoldingWord/en_tn/raw/branch/master/tn_MIC.tsv'
  )
  const [resultMessage, setResultMessage] = useState('')
  const [finalTSV, setFinalTSV] = useState('')
  const [renderTSV, setRenderTSV] = useState([])
  const [showResult, setShowResult] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState(null)
  const getALLBooksTN = (bookName, tn, ol, gl) => {
    const tsvText = tn
    const targetUsfm = gl
    const sourceUsfm = ol
    const sourceBook = getParsedUSFM(sourceUsfm).chapters
    const targetBook = getParsedUSFM(targetUsfm).chapters
    const getOLQuote = (quote, chapter, verse, sourceBook, targetBook) => {
      const ref = chapter + ':' + verse
      const verseOriginal = setBook(sourceBook, ref)
      const verseTarget = setBook(targetBook, ref)

      const verseObjectsOriginal = verseOriginal.verses[0].verseData?.verseObjects

      const verseObjectsTarget = verseTarget.verses[0].verseData?.verseObjects
      const flatten = helper
        .flattenVerseObjects({ verseObjects: verseObjectsTarget })
        .filter((el) => el.content)

      // 1 этап - вытягиваю весь стих в строку
      // return
      const verseObjectsTargetString = verseObjectsToString(verseObjectsTarget || [])
      const verseObjectsOriginalString = verseObjectsToString(verseObjectsOriginal || [])
      //2 этап - ищу в этом стихе цитату
      const greekSelections = []

      if (verseObjectsTargetString.includes(quote)) {
        //3 этап - если есть совпадение - тогда ищу в этой цитате occurrence и occurrences

        const wordsTargetObjects = selectionsFromQuoteAndString({
          string: verseObjectsTargetString,
          occurrence: 1,
          quote,
        })
        // 4 этап  - ищу совпадения найденных слов во всем массиве стихов

        for (const item of flatten) {
          for (const word of item.words) {
            if (
              wordsTargetObjects
                .map((el) => JSON.stringify(el))
                .includes(JSON.stringify(word))
            ) {
              const content = item.content
              greekSelections.push(
                content.map((el) => ({ ...el, reference: { chapter, verse } }))
              )
              break
            }
          }
        }
      } else {
        if (quote?.includes('…')) {
         console.log(quote)
         console.log(verseObjectsTargetString)
         const wordsTargetObjects = selectionsFromQuoteAndString({
           string: verseObjectsTargetString,
           occurrence: 1,
           quote,
         })
         for (const item of flatten) {
           for (const word of item.words) {
             if (
               wordsTargetObjects
                 .map((el) => JSON.stringify(el))
                 .includes(JSON.stringify(word))
             ) {
               const content = item.content
               greekSelections.push(
                 content.map((el) => ({ ...el, reference: { chapter, verse } }))
               )
               break
             }
           }
         }
        }

        
      }
      //5 этам - выравниваем полученный массив

      const quoteString = greekSelections
        .flat()
        .map((el) => el.text)
        .join(' ')
      //6 этап - ищем совпадения по оригинальному языку
      /* Это функция Абеля - похоже выдаёт правильный порядок - возвращает Map*/

      const occ = getQuoteMatchesInBookRef({
        quote: quoteString,
        ref,
        bookObject: sourceBook,
        isOrigLang: true,
        occurrence: -1,
      })
      const result = occ.get(ref)
      /*7 этап - возвращаем результат, который будет записываться в tsv.
    Если результат успешный - то его пишем, если нет - пишем ~ - потому что есть необработанная Абелевским скриптом фраза, а есть отсутсвие этой фразы, может пригодится*/
      return {
        result: result ? result?.map((el) => el.text).join(' ') : '~' + quoteString,
      }
    }

    const tsvRows = tsvText.split('\n').map((el) => el.split('\t'))
    tsvRows[0].splice(5, 0, 'OrigQuote')
    let result = [tsvRows[0].join('\t')]
    let success = 0
    let errors = 0
    let threeDots = 0

    for (let i = 1; i < tsvRows.length; i++) {
      const Reference = tsvRows[i][0]
      const Quote = tsvRows[i][4]
      const [chapter, verse] = Reference.split(':')
      if (verse === 'intro') {
        result.push(
          [
            tsvRows[i][0],
            tsvRows[i][1],
            tsvRows[i][2],
            tsvRows[i][3],
            tsvRows[i][4],
            '',
            tsvRows[i][5],
            tsvRows[i][6],
          ].join('\t')
        )
        continue
      }
      const origQuote = getOLQuote(Quote, chapter, verse, sourceBook, targetBook)
      if (!origQuote.result.includes('~')) {
        success++
      } else {
        errors++
      }
      // console.log('tsvrows5', origQuote)
      result.push(
        [
          tsvRows[i][0],
          tsvRows[i][1],
          tsvRows[i][2],
          tsvRows[i][3],
          tsvRows[i][4],
          origQuote.result,
          tsvRows[i][5],
          tsvRows[i][6],
        ].join('\t')
      )
    }
    const resultMessage =
      bookName +
      ':' +
      'success:' +
      success +
      ' ' +
      'errors:' +
      errors +
      ' ' +
      'all:' +
      (success + errors) +
      ' ' +
      'persent:' +
      Math.round((success / (success + errors)) * 100) +
      '%' +
      '...' +
      threeDots +
      '\n'
    setResultMessage(resultMessage)
    return result.join('\n')
  }
  const handleDownload = () => {
    setIsDownloading(true)
    const element = document.createElement('a')
    const file = new Blob([finalTSV], { type: 'tsv' })
    element.href = URL.createObjectURL(file)
    element.download = tn.slice(-10)
    element.click()
    setIsDownloading(false)
  }
  const getResource = async (url) => {
    let data = null
    let error = null
    try {
      const resource = await axios.get(url)
      data = resource
    } catch (err) {
      error = err
      console.log(err)
    }
    return { data, error }
  }
  const getResources = async () => {
    setResultMessage('')
    setIsCalculating(true)
    const glUsfm = await getResource(gl)
    const olUsfm = await getResource(ol)
    const tnTsv = await getResource(tn)
    if (glUsfm.data && olUsfm.data && tnTsv.data) {
      const res = getALLBooksTN(
        'test',
        tnTsv.data.data,
        olUsfm.data.data,
        glUsfm.data.data
      )
      if (res) {
        setIsCalculating(false)
        setFinalTSV(res)
      }
    } else {
      setError({ message: 'Resources is wrong' })
      console.log('resources is wrong')
      setIsCalculating(false)
    }
  }
  const inputs = [
    { value: tn, label: 'TN', setter: setTn },
    { value: ol, label: 'OL', setter: setOl },
    { value: gl, label: 'GL', setter: setGl },
  ]

  useEffect(() => {
    if (finalTSV) {
      const tsvRows = finalTSV.split('\n')
      setRenderTSV(tsvRows)
    }
  }, [finalTSV])

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 border p-8 w-full">
        {inputs.map((el, index) => (
          <div key={index} className="flex gap-2">
            <div>{el.label}</div>
            <input
              className="border w-full p-1"
              value={el.value}
              onChange={(e) => {
                setError(null)
                el.setter(e.target.value)
              }}
            />
          </div>
        ))}
        {error?.message && <div className="text-red-500">{error.message}</div>}
        <button
          disabled={isCalculating}
          onClick={getResources}
          className="border w-fit p-2 rounded-xl bg-slate-200 hover:bg-white hover:border-white disabled:text-gray-400 disabled:hover:bg-slate-200"
        >
          Start
        </button>
        <button
          disabled={!finalTSV}
          onClick={handleDownload}
          className=" w-fit p-2 rounded-xl bg-slate-200 hover:bg-white  disabled:text-gray-400 disabled:hover:bg-slate-200"
        >
          download
        </button>
        <button
          disabled={!finalTSV || isDownloading}
          onClick={() => setShowResult((prev) => !prev)}
          className=" w-fit p-2 rounded-xl bg-slate-200 hover:bg-white  disabled:text-gray-400 disabled:hover:bg-slate-200"
        >
          Show result
        </button>
      </div>
      {isCalculating&&<div className='w-1/6 bg-gray-200 h-5 animate-pulse'></div>}<div>{resultMessage}</div>
      <div className={showResult ? 'block' : 'hidden'}>
        {renderTSV?.map((el, index) => (
          <div key={index} className="flex gap-2 border">
            {el.split('\t').map((item, idx) => (
              <div key={idx} className="w-1/6">
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Main
