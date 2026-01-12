import { CAROUSEL_CONFIG } from '../constants.js'

export class CarouselManager {
  constructor(locations, onSlideChange) {
    this.locations = locations
    this.onSlideChange = onSlideChange
    this.glide = null
    this.slidesContainer = null
  }

  // Setup carousel
  init() {
    this.slidesContainer = document.getElementById('event-slides')
    if (!this.slidesContainer) {
      console.error('event-slides container not found')
      return
    }

    this.renderSlides()
    this.initializeGlide()
    this.goToDefaultSlide()
  }

  // Build all slides
  renderSlides() {
    this.locations.forEach((loc) => {
      const slide = this.createSlide(loc)
      this.slidesContainer.appendChild(slide)
    })
  }

  // Create one slide
  createSlide(loc) {
    const slide = document.createElement('li')
    slide.className = 'glide__slide'

    const card = this.createEventCard(loc)
    slide.appendChild(card)

    return slide
  }

  // Create event card
  createEventCard(loc) {
    const card = document.createElement('div')
    card.className = 'event-card'
    card.setAttribute('data-location-id', loc.id)

    const cardHeader = this.createCardHeader(loc)
    card.appendChild(cardHeader)

    return card
  }

  // Header with image and info
  createCardHeader(loc) {
    const cardHeader = document.createElement('div')
    cardHeader.className = 'card-header'

    const cardImage = this.createCardImage(loc)
    const cardInfo = this.createCardInfo(loc)

    cardHeader.appendChild(cardImage)
    cardHeader.appendChild(cardInfo)

    return cardHeader
  }

  // Card image
  createCardImage(loc) {
    const cardImage = document.createElement('img')
    cardImage.className = 'card-image'
    cardImage.src = loc.image
    cardImage.alt = loc.name

    return cardImage
  }

  // Card info section
  createCardInfo(loc) {
    const cardInfo = document.createElement('div')
    cardInfo.className = 'card-info'

    const cardTitle = this.createCardTitle(loc.name)
    const cardMeta = this.createCardMeta(loc)
    const cardCountdown = this.createCardCountdown(loc.startDate)

    cardInfo.appendChild(cardTitle)
    cardInfo.appendChild(cardMeta)
    cardInfo.appendChild(cardCountdown)

    return cardInfo
  }

  // Card title
  createCardTitle(name) {
    const cardTitle = document.createElement('h3')
    cardTitle.className = 'card-title'
    cardTitle.textContent = name

    return cardTitle
  }

  // Card metadata
  createCardMeta(loc) {
    const cardMeta = document.createElement('div')
    cardMeta.className = 'card-meta'
    cardMeta.innerHTML = `<span>📍 ${loc.venue}</span><span>`

    return cardMeta
  }

  // Countdown element
  createCardCountdown(eventDate) {
    const cardCountdown = document.createElement('div')
    cardCountdown.className = 'card-countdown'
    cardCountdown.setAttribute('data-event-date', eventDate.toISOString())

    return cardCountdown
  }

  // Init Glide
  initializeGlide() {
    // eslint-disable-next-line no-undef
    this.glide = new Glide('.glide', CAROUSEL_CONFIG)
    this.glide.mount()

    this.glide.on('run.after', () => {
      this.handleSlideChange()
    })
  }

  // Go to default slide based on date
  goToDefaultSlide() {
    const initialIndex = this.calculateDefaultSlideIndex()
    this.glide.go(`=${initialIndex}`)

    // Set initial target and highlight
    if (this.locations[initialIndex]) {
      this.setActiveCard(initialIndex)
      if (this.onSlideChange) {
        this.onSlideChange(this.locations[initialIndex].id)
      }
    }
  }

  // Pick default index by date
  calculateDefaultSlideIndex() {
    const now = new Date()
    let initialIndex = 0

    // Find the next upcoming event or the event happening today
    for (let i = 0; i < this.locations.length; i++) {
      const eventDate = new Date(this.locations[i].startDate)
      const eventEndDate = new Date(eventDate)
      eventEndDate.setHours(23, 59, 59, 999)

      if (now <= eventEndDate) {
        initialIndex = i
        break
      }
    }

    // If all events are in the past, select the last one
    if (initialIndex === 0 && now > new Date(this.locations[this.locations.length - 1].startDate)) {
      initialIndex = this.locations.length - 1
    }

    return initialIndex
  }

  // Handle slide change
  handleSlideChange() {
    const activeIndex = this.glide.index
    this.setActiveCard(activeIndex)

    // Trigger callback with new location
    if (this.onSlideChange && this.locations[activeIndex]) {
      const locationId = this.locations[activeIndex].id
      this.onSlideChange(locationId)
    }
  }

  // Highlight active card
  setActiveCard(activeIndex) {
    const cards = document.querySelectorAll('.event-card')
    cards.forEach((card, idx) => {
      if (idx === activeIndex) {
        card.classList.add('active')
      } else {
        card.classList.remove('active')
      }
    })
  }

  // Current slide index
  getCurrentIndex() {
    return this.glide ? this.glide.index : 0
  }

  // Navigate to slide
  goToSlide(index) {
    if (this.glide) {
      this.glide.go(`=${index}`)
    }
  }
}
