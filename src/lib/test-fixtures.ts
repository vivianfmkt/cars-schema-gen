import type { PdpFormData, VehicleVersion } from '../model/types';
import { createBlankData as makeData, createBlankImage as makeImage, createBlankOffer as makeOffer, createBlankVersion as makeVersion, createBlankVideo as makeVideo } from './ids';

export const createBlankData = (): PdpFormData => makeData();
export const createBlankVersion = (name = ''): VehicleVersion => makeVersion(name);
export const createBlankImage = makeImage;
export const createBlankVideo = makeVideo;
export const createBlankOffer = makeOffer;
