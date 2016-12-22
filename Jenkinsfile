node {
    def nodeHome = tool name: 'node7.2.1', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
    env.PATH = "${nodeHome}/bin:${env.PATH}"
    def slackToken = 'ar0E6BOSOqHZe8o1ZmynkBRf'
    def git_hash = 'latest'

    try {
        stage('check environment') {
            sh('node -v')
            sh('npm -v')
        }

        stage('checkout') {
            checkout([$class: 'GitSCM', branches: [[name: 'dev']], doGenerateSubmoduleConfigurations: false, extensions: [], submoduleCfg: [], userRemoteConfigs: [[credentialsId: '05581df4-3d49-4e41-bb5b-c8efac5f1dbd', url: 'github.com:Interface-Foundry/IF-root.git']]])

            // git hash for use in image tag
            sh "git rev-parse --short HEAD > .git/commit-id"
            git_hash = readFile('.git/commit-id').trim()
            echo "git hash: ${git_hash}"
        }

        // stage('npm install') {
        //     sh('npm install')
        //     sh('npm install -g mocha')
        //     sh('npm install --only=dev')
        // }

        // stage('nodejs tests') {
        //     sh('NODE_ENV=test PRINT_DATA=true mocha --require should --reporter spec tests/parser/parser.test.js')
        // }

        // stage('python tests') {

        // }


        stage('build docker images') {
            sh('docker build -t gcr.io/kip-styles/picstitch:'+git_hash+' -f Dockerfiles/picstitch.Dockerfile .')
        //     sh('docker build -t gcr.io/kip-styles/facebook:666 -f Dockerfiles/facebook.Dockerfile .')
        //     sh('docker build -t gcr.io/kip-styles/facebook:666 -f Dockerfiles/facebook.Dockerfile .')
        }

        stage('push to gcloud') {
            sh('gcloud auth activate-service-account --key-file=src/k8s/other/gcloud.json')
            sh('gcloud docker push gcr.io/kip-styles/picstitch:'+git_hash)
        }


        stage('updating kubernetes files') {
            sh("sed -i.bak 's#IMAGE_TAG#${git_hash}#' src/k8s/canary/canary.picstitch.yaml")
        }


        stage('applying kubernetes files') {
            sh("kubectl --namespace=canary apply -f src/k8s/canary/canary.picstitch.yaml")
        }

        stage('slackInfo') {
           slackSend (channel: '#ci', color: 'good', message: 'using git hash: ' + git_hash, teamDomain: 'kipsearch', token: slackToken)
        }
    }

    catch (err) {
        throw err
    }
}