// Mock for webgazer library used in tests
const webgazer = {
  setGazeListener: function () {
    return this
  },
  begin: async function () {
    return this
  },
  end: function () {
    return this
  },
  showVideo: function () {
    return this
  },
  showFaceOverlay: function () {
    return this
  },
  showFaceFeedbackBox: function () {
    return this
  },
  showPredictionPoints: function () {
    return this
  },
  setRegression: function () {
    return this
  },
  saveDataAcrossSessions: function () {
    return this
  },
  applyKalmanFilter: function () {
    return this
  },
  recordScreenPosition: function () {},
  clearData: function () {},
  pause: function () {
    return this
  },
  resume: function () {
    return this
  },
}

export default webgazer
