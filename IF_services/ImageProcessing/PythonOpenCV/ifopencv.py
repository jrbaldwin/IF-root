import json
import urllib
import numpy
import cv2


#Resizes an image if necessary
def resizeLargeImage(img):
    max_size = 1000
    height, width, channels = img.shape
    if height > max_size or width > max_size:
        if height > width:
            res = cv2.resize(img, (width/height*max_size, max_size), interpolation = cv2.INTER_CUBIC)
        else:
            res = cv2.resize(img, (max_size, height/width*max_size), interpolation = cv2.INTER_CUBIC)
        return res
    else:
        return img


#Get Image from file: input path, output image python object
def getFromFile(filename):
    return resizeLargeImage(cv2.imread(filename))


#Get Image from S3: input url, output image python object
def getFromS3(url):
    (tmpfile, _) = urllib.urlretrieve(url)
    return getFromFile(tmpfile)


#Extract Foreground: input image, output foreground image
def extractForeground(image):
    return image


#K-mean Segmentation: input image, output segmented image
def kMeanSegmentation(image):
    return image


#Find Blobs: input image, output array of blob centers
def findBlobs(image):
    return []


#Find Faces: input image, output array of face centers
def findFaces(image):
    return []