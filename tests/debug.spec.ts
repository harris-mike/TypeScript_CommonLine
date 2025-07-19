import { test, expect, type Page } from '@playwright/test';
import { Commonline } from '../common/commonline';
import { readFileSync, writeFileSync } from 'node:fs';

test('debug', async ({ page }) => {
  var cl = new Commonline()

  var valueInFile = cl.getFieldValueFromFile(__dirname+"/../files/APPSEND.sis",'1','62a')
  
  var contentsOfFile = cl.readDataFromFile(__dirname + "/../files/APPSEND.sis");
  
  cl.updateFieldValueInRecord('test', contentsOfFile, '1', '62a','1')
  
  cl.createFileWithData('APPSEND','4',contentsOfFile,__dirname+"/../files/testme.sis")
  
  console.log("")
})