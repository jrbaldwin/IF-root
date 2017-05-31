const initialState = {
  ribbon: {
    left: [{
      title: '',
      link: ''
    }],
    right: {
      loginText: '',
      newCartText: '',
      addToSlackText: ''
    }
  },
  header: {
    readMoreText: ''
  },
  hero: {
    headline: '',
    description: '',
    buttonText: '',
    slackText: '',
    subtext: [],
    learnMore: '',
    imgUrl: 'https://storage.googleapis.com/kip-random/website/kip_collect.gif'
  },
  services: {
    tagline: '',
    tagDescrip: '',
    details: {
      descrips: [],
      actionText: '',
      slackActionText: ''
    }
  },
  compare: {
    tagline: '',
    subHead: '',
    buttonText: '',
    slackButtonText: '',
    categories: [],
    competitors: [{ image: '', data: [] }]
  },
  footer: {
    links: []
  },
  help: {
    titleText: '',
    stepText: '',
    subtext: [],
    faq: [],
    images: []
  },
  blog: {
    titleText: '',
    subtext: []
  },
  about: {
    titleText: '',
    subtext: [],
    why: {
      head: '',
      description: '',
      actionText: '',
      images: [],
      reasons: []
    }
  }
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
  case 'GOT_SITE':
    return {
      ...action.response
    };
  default:
    return state;
  }
}