'use strict'

class ScirpusContent {
  get ampLinkElement () {
    return document.querySelector(`link[rel="amphtml"][href]`)
  }
  isAMPPage () {
    const htmlElement = document.documentElement
    return htmlElement.hasAttribute('⚡') || htmlElement.hasAttribute('amp')
  }
  hasAMPPage () {
    const ampLinkElement = this.ampLinkElement
    return !!ampLinkElement
  }
  get ampPageURL () {
    if (!this.hasAMPPage()) {
      return null
    }
    return this.ampLinkElement.href
  }
  get canonicalURL () {
    const canonicalLinkElement = document.querySelector(`link[rel="canonical"][href]`)
    if (!!canonicalLinkElement && this.isAMPPage()) {
      return canonicalLinkElement.href
    }
    else {
      return null
    }
  }
  get pageType () {
    let type = ''
    if (this.hasAMPPage()) {
      type = 'hasamp'
    }
    if (this.isAMPPage()) {
      type = 'isamp'
    }
    return type
  }
  get ampInfo () {
    return {
      pageType: this.pageType,
      ampPageURL: this.ampPageURL,
      canonicalURL: this.canonicalURL,
    }
  }
}

// initialize
const scirpusContent = new ScirpusContent()

// message from background page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.name === 'get-amp-info') {
    let ampInfo = null
    if (scirpusContent.hasAMPPage() || scirpusContent.isAMPPage()) {
      ampInfo = scirpusContent.ampInfo
    }
    sendResponse({name: 'amp-info', data: ampInfo})
  }
})