import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'ini';

/**
 * This class allows for reading and writing and manipulation of commonLine Files.
 * @author Michael Harris
 */
export class Commonline {
    public standard: any;
    public fileType: string
    private recordType: string
    public version: string
    private record = {}

    /**
     * The constructor builds the blank record.
     */
    constructor() {
        this.buildStandard()
        this.record['H'] = {}
        this.record['R'] = {}
        this.record['T'] = {}
    }

    /**
     * This reads in a file then returns the value from the specified field.
     * 
     * @param fileName The file name to read.
     * @param recordType This would be the record type - 1, 2, 102, 128
     * @param fieldId The field Id - from common line if you are using the Change @6 record then use 1a and 2a for the unidentifed fields
     * @param recordIndex The index of the specified record type, if there are 2 record then they are index 1 and 2. 
     * @returns the value for the specified field.
     */
    public getFieldValueFromFile(fileName: string, recordType: string, fieldId: string, recordIndex: number = 1):string {
        const fileData = this.readDataFromFile(fileName);
        var headerString: string = ''
        var recordTypeId:string = 'R'
         var value :string = ''

        for (let i = 1; i < 10; i++) {
            headerString += fileData['H'][1][i]
        }
        this.identifyFileType(headerString)

        if(recordType.toLocaleUpperCase() == 'H' || recordType.toLocaleUpperCase() == 'T' )
        {
            recordTypeId = recordType.toLocaleUpperCase()
        }

        var field = this.getFieldindex(fieldId, this.fileType, this.recordType, this.version)
        value = String(fileData[recordTypeId][recordType][recordIndex][field])
        return value
    }

    /**
     * This updates the data object representing the commoonLine file.
     * 
     * @param newValue The value to put into the commonLine field.
     * @param fileData The record set representing the CommonLine file
     * @param recordType This would be the record type - 1, 2, 102, 128
     * @param fieldId The field Id - from common line if you are using the Change @6 record then use 1a and 2a for the unidentifed fields
     * @param recordIndex The index of the specified record type, if there are 2 record then they are index 1 and 2. 
     * @returns 
     */
    public updateFieldValueInRecord(newValue: string, fileData: {}, recordType: string, fieldId: string, recordIndex: string = '1'):any {
        var headerString: string = ''
        var recordTypeId:string = 'R'
        
        for (let i = 1; i < 10; i++) {
            headerString += fileData['H'][1][i]
        }
        this.identifyFileType(headerString)

        if(recordType.toLocaleUpperCase() == 'H' || recordType.toLocaleUpperCase() == 'T' )
        {
            recordTypeId = recordType.toLocaleUpperCase()
        }

        var field = this.getFieldindex(fieldId, this.fileType, this.recordType, this.version)
        console.log(fileData[recordTypeId][recordType][recordIndex][field])
        fileData[recordTypeId][recordType][recordIndex][field] = newValue
        return fileData
    }

    /**
     * This creates a commonline file with the specified data object.
     * 
     * @param fileType the file type of APPSEND, CHANGE, RESPONSE, DISB
     * @param clVersion the version of the commonline file 4 or 5
     * @param fileData the dat to be written to the file
     * @param fileName the full name containing the full path and file name
     */
    public createFileWithData(fileType: string, clVersion: string, fileData: {}, fileName: string) {
        var newFileData = ''
        var headerRecord = ''
        var mainRecord = ''
        var trailerRecord = ''

        for (var line in fileData['H']) {
            var fields: any = this.standard[fileType.toUpperCase() + "_V" + clVersion + "_RH"]['fields'].split(",")
            for (var fieldId in fields) {
                var field = this.standard[fileType.toUpperCase() + "_V" + clVersion + "_RH" + "_F" + fields[fieldId]]
                var value = fileData['H'][line][field['FIELD_NUM']]  //line.substring(Number(field['START']) - 1, (Number(field['START']) - 1) + Number())
                value = this.padValue(value, field['JUSTIFY'], field['LENGTH'], field['PAD'])
                headerRecord += value
            }
            headerRecord += "\n"
        }
        console.log(headerRecord.length)
        field = ''
        value = ''
        var processIt = true

        for (var line in fileData['R']) {
            for (var rLine in fileData['R'][line]) {
                processIt = true
                var fields: any = this.standard[fileType.toUpperCase() + "_V" + clVersion + "_R" + line]['fields'].split(",")
                for (var fieldId in fields) {
                    var field = this.standard[fileType.toUpperCase() + "_V" + clVersion + "_R" + line + "_F" + fields[fieldId]]
                    var value = fileData['R'][line][rLine][field['FIELD_NUM']]

                    if (field['FIELD_NUM'] == '1' && value == '') {
                        processIt = false
                    }

                    if (processIt == true) {
                        value = this.padValue(value, field['JUSTIFY'], field['LENGTH'], field['PAD'])
                        mainRecord += value
                    }
                }
                if (processIt == true) {
                    mainRecord += "\n"
                }
            }
        }
        console.log(mainRecord.length)
        field = ''
        value = ''
        for (var line in fileData['T']) {
            var fields: any = this.standard[fileType.toUpperCase() + "_V" + clVersion + "_RT"]['fields'].split(",")
            for (var fieldId in fields) {
                var field = this.standard[fileType.toUpperCase() + "_V" + clVersion + "_RT" + "_F" + fields[fieldId]]
                var value = fileData['T'][line][field['FIELD_NUM']]
                value = this.padValue(value, field['JUSTIFY'], field['LENGTH'], field['PAD'])
                trailerRecord += value
            }
            trailerRecord += "\n"
        }
        console.log(trailerRecord.length)

        newFileData = headerRecord + mainRecord + trailerRecord
        this.writeFile(newFileData, fileName)
    }

    /**
     * This is a private function that writes the data to a file.
     * 
     * @param fileData The data to be writen to a file in it's final form.
     * @param fileName The file name the data is supposed to be written to.
     */
    private writeFile(fileData: string, fileName: string) {
        writeFileSync(fileName, fileData);
    }

    /**
     * This pads a value on the left or rright side with the specified value
     * 
     * @param value the value to be padded
     * @param padDirection 1 = left, 2 = right
     * @param padWithValue value to pad with
     */
    private padValue(value: string, padDirection: string, padLength: number, padWithValue: string = " ") {
        if (padWithValue.toLowerCase() == 'space') {
            padWithValue = " "
        }
        if (padDirection == '1') {
            value = value.padStart(<number>padLength, padWithValue)
        }
        else if (padDirection == '2') {
            value = value.padEnd(padLength, padWithValue)
        }
        return value
    }

    /**
     * this reads a file into  dictionary and returns it.
     * 
     * @param fileName the file to read
     * @returns dictionary
     */
    public readDataFromFile(fileName: string) {
        const fileData = readFileSync(fileName, { encoding: 'utf-8' });
        const fileParts = fileData.split("\n")
        this.identifyFileType(fileParts[0])
        var id = this.fileType + "_V" + this.version + "_R"
        var line = ''
        var field: string
        var value: string
        var index1 = 0
        var indexh = 0
        var indext = 0
        var index = 0
        var localRecordType = ''

        for (var lineid in fileParts) {
            line = fileParts[lineid]
            this.identifyRecordType(line)
            localRecordType = this.getLocalRecordType(this.recordType)

            var fields: any = this.standard[id + this.recordType]['fields'].split(",")
            for (var fieldId in fields) {
                field = this.standard[id + this.recordType + "_F" + fields[fieldId]]
                value = line.substring(Number(field['START']) - 1, (Number(field['START']) - 1) + Number(field['LENGTH']))

                if (this.recordType == 'H' && field['FIELD_NUM'] == '1') {
                    indexh = indexh + 1
                    index = indexh
                    this.record[localRecordType][index] = {}
                } else if (this.recordType == 'T' && field['FIELD_NUM'] == '1') {
                    indext = indext + 1
                    index = indext
                    this.record[localRecordType][index] = {}
                }
                else if (field['FIELD_NUM'] == '1') {
                    index1 = index1 + 1
                    index = index1

                    if (Object.keys(this.record[localRecordType]).includes(this.recordType) == false) {
                        this.record[localRecordType][this.recordType] = {}
                    }
                    this.record[localRecordType][this.recordType][index] = {}
                }

                if (this.recordType == 'H' || this.recordType == 'T') {
                    this.record[localRecordType][index][field['FIELD_NUM']] = value
                } else {
                    this.record[localRecordType][this.recordType][index][field['FIELD_NUM']] = value
                }
            }
        }
        return this.record
    }

    /**
     * This identifies the record type such as Header, Trailer, 1, 102 128 record type.
     * 
     * @param recordData The ata in string format that is used to dentify the record. 
     */
    private identifyRecordType(recordData: string) {
        var recordID = recordData.substring(0, 4);

        //need to add additional record types here for all records
        if (recordID.includes('@H')) {
            this.recordType = 'H'
        } else if (recordID.includes('@T')) {
            this.recordType = 'T'
        } else if (recordID == '@102') {
            this.recordType = '102'
        }
        else if (recordID == '@107') {
            this.recordType = '107'
        }
        else {
            this.recordType = '1'
        }
    }

    /**
     * This build a data object from the commonline_std.ini file.
     */
    private buildStandard() {
        try {
            const iniContent = readFileSync(__dirname + '/commonline_std.ini', { encoding: 'utf-8' });
            this.standard = parse(iniContent);
        } catch (error) {
            console.error('Error reading or parsing Standard INI file:', error);
        }
    }

    /**
     * This user the header string data and determine the file type and version and populates class variables.
     * @param headerData 
     */
    private identifyFileType(headerData: string) {
        const id = headerData.substring(40, 80)
        if (id.includes('A004') == true) {
            this.fileType = 'APPSEND'
            this.version = '4'
        } else if (id.includes('A005') == true) {
            this.fileType = 'APPSEND'
            this.version = '5'
        } else if (id.includes('R004') == true) {
            this.fileType = 'RESPONSE'
            this.version = '4'
        } else if (id.includes('R005') == true) {
            this.fileType = 'RESPONSE'
            this.version = '5'
        } else if (id.includes('C004') == true) {
            this.fileType = 'CHANGE'
            this.version = '4'
        } else if (id.includes('C005') == true) {
            this.fileType = 'CHANGE'
            this.version = '5'
        } else if (id.includes('DF05') == true) {
            this.fileType = 'DISB'
            this.version = '5'
        } else if (id.includes('E005') == true) {
            this.fileType = 'DISB'
            this.version = '5'
        } else if (id.includes('EA05') == true) {
            this.fileType = 'DISB'
            this.version = '5'
        } else if (id.includes('DF04') == true) {
            this.fileType = 'DISB'
            this.version = '4'
        } else if (id.includes('E004') == true) {
            this.fileType = 'DISB'
            this.version = '4'
        } else if (id.includes('EA04') == true) {
            this.fileType = 'DISB'
            this.version = '4'
        }
    }

    /**
     * This Determines the record type H,R or T, This is the oly determination.
     *  
     * @param recordType Passing filed 1's value without the @ symbol.
     * @returns 1 character string.
     */
    private getLocalRecordType(recordType):string {
        var localRecordType = ''
        switch (recordType) {
            case 'H':
                localRecordType = 'H'
                break;
            case 'T':
                localRecordType = 'T'
                break;
            default:
                localRecordType = 'R'
        }
        return localRecordType
    }

    /**
     * This convers the CommonLine file number to the standards field index.
     * 
     * @param fieldName the CommonLine Field number, "62a"
     * @param fileType The file type. APPSEND, CHANGE, RESPONSE, DISBROST 
     * @param recordType This would be the record type - 1, 2, 102, 128
     * @param version the CommonLine record version. 4 or 5 
     * @returns false if the field was not found otherwise a string with the index.
     */
    private getFieldindex(fieldName: string, fileType: string, recordType: string, version: string):any {
        var fields: any = this.standard[fileType.toUpperCase() + "_V" + version + "_R" + recordType]['fields'].split(",")
        for (var fieldId in fields) {
            var field = this.standard[fileType.toUpperCase() + "_V" + version + "_R" + recordType + "_F" + fields[fieldId]]
            if (field['FIELD_NUM'] == fieldName) {
                return fieldId
            }
        }
        return false
    }
}