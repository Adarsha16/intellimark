import { locations } from './config/locations.js'
import { StateManager } from './managers/StateManager.js'
import { ARSceneManager } from './managers/ARSceneManager.js'
import { CarouselManager } from './managers/CarouselManager.js'
import { NavigationManager } from './managers/NavigationManager.js'
import { HUDController } from './components/HUDController.js'
import { ArrowAnimator } from './components/ArrowAnimator.js'

window.onload = () => {
  initApp()
}

function initApp() {
  const stateManager = new StateManager()

  const hudController = new HUDController()
  hudController.init()

  const arrowAnimator = new ArrowAnimator(stateManager)
  arrowAnimator.init()

  const arSceneManager = new ARSceneManager(locations, stateManager)
  arSceneManager.init()

  const navigationManager = new NavigationManager(
    locations,
    stateManager,
    arSceneManager,
    hudController,
    arrowAnimator
  )
  navigationManager.init()

  const carouselManager = new CarouselManager(locations, (locationId) => {
    navigationManager.setTarget(locationId)
  })
  carouselManager.init()

  arrowAnimator.start()
}
