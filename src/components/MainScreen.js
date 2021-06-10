import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, Alert, Image, TextInput, ScrollView, ActivityIndicator, Linking } from 'react-native';

export default class MainScreen extends React.Component {
    static navigationOptions = {
        header: null,
    };

    constructor() {
        super()
        // set states for fields so they could be rendered later on
        //these are all the values that can be dynamically modified
        this.state = { 
            location: '-',
            temperature: '-',
            lowTemperature: '-',
            highTemperature: '-',
            cloudCover: '-',
            chanceRain: '-',
            photoMessage: '-',
            sunriseTime: '-',
            sunsetTime: '-',
            latitude: '-',
            longitude: '-',
            hour: [['-', '-'],['-', '-'],['-', '-'],['-', '-'],['-', '-'],['-', '-'],['-', '-'],['-', '-'],['-', '-'],['-', '-'],['-', '-'],],
            backgroundSource: require("../assets/Sun.png"),
            localTime: '-',
            loadingComplete: false,
            now: '-',
            today: '-',
            week: '-',
        };
    }
    //updates the location field when the user types in the textinput
    handleChange = (text) => {
		this.setState({location: text });
    }
    //Once user presses the return/enter key in the textinput this is executed
	handleSubmit = (event) => {
        this.convertAndFetch()
        event.preventDefault();
         
    }
    //tasks taken from handleSubmit
    //this will get the coordinates of the city and then with those coordinates
    //we can gather data from Dark Sky API
    async convertAndFetch(){
        var check = await this.convertCityToCoor();
        if (check == true){
            await this.fetchAllData();
        }
        
    }

    //this method converts city names to coordinates
    //Latitude and Longitude
    async convertCityToCoor(){
        var loc = this.state.location;
        var check;
        //First API - this is used to retrieve coordinates by city name
        await fetch(`https://openweathermap.org/data/2.5/weather?q=${loc}&appid=REDACTED`)  
                .then(response => response.json())
                .then(json => {
                    this.setState({ // sets the latitude and longitude
                        latitude: json.coord.lat,
                        longitude: json.coord.lon
                    });
                    check = true;
            })
            .catch( //if something goes wrong, this error handling technique is used
                function() {
                    Alert.alert( //this is an alert pop up that warns the user
                        'Something went wrong',
                        'You have entered something that does not exist or you are not connected to the internet \n Please try again',
                        [
                          {text: 'OK'}
                        ],
                        {cancelable: false},
                        
                    );
                    var hourArr = []
                    for(i = 0; i < 12; i++){
                        hourArr[i] = ['-','-', require("../assets/hourly/snow.png")]; //snow is deafult error icon
                        }
                    //since something went wrong here, we just initialise all the values to
                      this.setState({
                            location: '-',
                            temperature: '-',
                            lowTemperature: '-',
                            highTemperature: '-',
                            cloudCover: '-',
                            chanceRain: '-',
                            photoMessage: '-',
                            sunriseTime: '-',
                            sunsetTime: '-',
                            hour: hourArr
                        });
                        check = false;
                }.bind(this));
            return check;
    }
    //this method will fetch all the neccesary data by the coordinates
    async fetchAllData(){ //this method is executed over and over again whenever user types in new location
        var lat = this.state.latitude;
        var lon = this.state.longitude;
        //fetch call made to the Dark Sky API
        await fetch(`https://api.darksky.net/forecast/306b553d75067faabce55167ac685cfd/${lat},${lon}?units=si`)
                .then(response => response.json())
                .then(json => {  
                    
                    var localtime = new Date(0);
                    localtime.setUTCSeconds(json.currently.time);
    
                    localtime = new Date(localtime).toLocaleString("en-US", {timeZone: json.timezone});
                    localtime = new Date(localtime);

                    var sunrise = new Date(0);
                    var sunset = new Date(0);

                    //calculates sunrise and sunset in the corresponding time zone
                    sunrise.setUTCSeconds(json.daily.data[0].sunriseTime);
                    sunset.setUTCSeconds(json.daily.data[0].sunsetTime);
                    
                    sunrise = new Date(sunrise).toLocaleString("en-US", {timeZone: json.timezone});
                    sunset = new Date(sunset).toLocaleString("en-US", {timeZone: json.timezone});
                    
                    sunrise = new Date(sunrise);
                    sunset = new Date(sunset);

                    sunrise = sunrise.getHours() + ":" + sunrise.getMinutes();
                    sunset = sunset.getHours() + ":" + sunset.getMinutes();

                    this.changeBackgroundImage(localtime) //this decides if background has to be changed
                    this.photoText(json); //this modifies the message for photographers
                    this.checkSummary(json); //this updates the 3 text in the bottom of screen
                    
                    var i;
                    var hourArr = [];
                    for(i = 0; i < 12; i++){ // this is only responsible for hourly sliding bar
                        var localhour = new Date(0);
                        localhour.setUTCSeconds(json.hourly.data[i].time);
                        localhour = new Date(localhour).toLocaleString("en-US", {timeZone: json.timezone});
                        localhour = new Date(localhour);
                        localhour = localhour.getHours();
                        var icon = this.decideIcon(json, i);

                        hourArr[i] = [localhour, Math.round(json.hourly.data[i].temperature), icon];
                    }

                    this.setState({ //this sets all the states that can be dynamically updated
                        temperature: Math.round(json.currently.temperature),
                        lowTemperature: Math.round(json.daily.data[0].temperatureLow),
                        highTemperature: Math.round(json.daily.data[0].temperatureHigh),
                        cloudCover: Math.round((json.currently.cloudCover * 100)),
                        chanceRain: Math.round((json.currently.precipProbability * 100)),
                        sunriseTime: sunrise,
                        sunsetTime: sunset,
                        hour: hourArr,
                    });
            })
            .catch( //error handling, in case the API is not working
                function() {
                    Alert.alert(
                        'Something went wrong',
                        'We had a problem retrieving data from online \n Please try again!',
                        [
                          {text: 'OK'}
                        ],
                        {cancelable: false},
                        
                    )}
            );
    }

    componentWillMount(){ //This methos is executed the first
        //it loads all the initial values
        //By the default the app takes the first location as the current location of the user
        var lat = 0;
        var lon = 0;
        navigator.geolocation.getCurrentPosition(
            position => {
                lat = String(position.coords.latitude);
                lon = String(position.coords.longitude); 
                
                fetch(`https://api.darksky.net/forecast/306b553d75067faabce55167ac685cfd/${lat},${lon}?units=si`)
                .then(response => response.json())
                .then(json => {  
                    
                    var localtime = new Date(0);
                    localtime.setUTCSeconds(json.currently.time);
    
                    localtime = new Date(localtime).toLocaleString("en-US", {timeZone: json.timezone});
                    localtime = new Date(localtime);

                    var sunrise = new Date(0);
                    var sunset = new Date(0);

                    //calculates sunrise and sunset in the corresponding time zone
                    sunrise.setUTCSeconds(json.daily.data[0].sunriseTime);
                    sunset.setUTCSeconds(json.daily.data[0].sunsetTime);
                    
                    sunrise = new Date(sunrise).toLocaleString("en-US", {timeZone: json.timezone});
                    sunset = new Date(sunset).toLocaleString("en-US", {timeZone: json.timezone});
                    
                    sunrise = new Date(sunrise);
                    sunset = new Date(sunset);

                    sunrise = sunrise.getHours() + ":" + sunrise.getMinutes();
                    sunset = sunset.getHours() + ":" + sunset.getMinutes();

                    this.changeBackgroundImage(localtime); //this decides if background has to be changed
                    this.photoText(json); //this modifies the message for photographers
                    this.checkSummary(json); //this updates the 3 text in the bottom of screen

                    var i;
                    var hourArr = [];
                    for(i = 0; i < 12; i++){ //this sets all the states that can be dynamically updated
                        var localhour = new Date(0);
                        localhour.setUTCSeconds(json.hourly.data[i].time);
                        localhour = new Date(localhour).toLocaleString("en-US", {timeZone: json.timezone});
                        localhour = new Date(localhour);
                        localhour = localhour.getHours();
                        var icon = this.decideIcon(json, i);

                        hourArr[i] = [localhour, Math.round(json.hourly.data[i].temperature), icon];
                    }

                    this.setState({ //this sets all the states that can be dynamically updated
                        location: json.timezone,
                        temperature: Math.round(json.currently.temperature),
                        lowTemperature: Math.round(json.daily.data[0].temperatureLow),
                        highTemperature: Math.round(json.daily.data[0].temperatureHigh),
                        cloudCover: Math.round((json.currently.cloudCover * 100)),
                        chanceRain: Math.round((json.currently.precipProbability * 100)),
                        sunriseTime: sunrise,
                        sunsetTime: sunset,
                        hour: hourArr,
                        loadingComplete: true,
                    });
            })
            .catch( //error handling, in case the API is not working
                function() {
                    Alert.alert(
                        'Something went wrong',
                        'We had a problem retrieving data from online \n Please try again!',
                        [
                          {text: 'OK'}
                        ],
                        {cancelable: false},
                        
                    )}
            );
        });
    }
    decideIcon(json, i){ //this decided which icon should be loaded for each hour in the sliding bar
        var icon;
        if (json.hourly.data[i].icon == "clear-day"){
            icon = require("../assets/hourly/clear-day.png");
        }
        else if (json.hourly.data[i].icon == "clear-night"){
            icon = require("../assets/hourly/clear-night.png");
        }
        else if (json.hourly.data[i].icon == "cloudy"){
            icon = require("../assets/hourly/cloudy.png");
        }
        else if (json.hourly.data[i].icon == "fog"){
            icon = require("../assets/hourly/fog.png");
        }
        else if (json.hourly.data[i].icon == "partly-cloudy-day"){
            icon = require("../assets/hourly/partly-cloudy-day.png");
        }
        else if (json.hourly.data[i].icon == "partly-cloudy-night"){
            icon = require("../assets/hourly/partly-cloudy-night.png");
        }
        else if (json.hourly.data[i].icon == "rain"){
            icon = require("../assets/hourly/rain.png");
        }
        else if (json.hourly.data[i].icon == "sleet"){
            icon = require("../assets/hourly/sleet.png");
        }
        else if (json.hourly.data[i].icon == "snow"){
            icon = require("../assets/hourly/snow.png");
        }
        else if (json.hourly.data[i].icon == "wind"){
            icon = require("../assets/hourly/wind.png");
        }
        return icon;
    }
    changeBackgroundImage(time){
        hours = time.getHours();

        if (hours >= 11 && hours <= 17){ //daylight between 11 and 18
            this.setState({
                backgroundSource: require("../assets/Sun.png")
            })
        }
        else if (hours > 17 && hours <= 21){//sunset 18 to  22
            this.setState({
                backgroundSource: require("../assets/Blood.png")
            })
        }
        else if (hours > 21 || hours <= 10){ //mooon between 21 and 10
            this.setState({
                backgroundSource: require("../assets/Moon.png")
            })
        }
    }
    photoText(json){ //this method generates the message for the photographer depending on different weather combinations

        if (json.daily.moonPhase>0.9 && json.currently.cloudCover<0.2)
        {
            this.setState({photoMessage: "Beautiful day for night photography"});
        }
        else if(json.currently.cloudCover>0.7 && json.currently.precipProbability>0.8)
        {
            this.setState({photoMessage: "Perfect rain photography session"});
        }
        else if(json.daily.data[0].temperatureLow>15 && json.daily.data[0].temperatureHigh>20 && json.daily.data[0].cloudCover<0.3)
        {
            this.setState({photoMessage: "Grab an icecream for a good photography session"});
        }
        else if(json.daily.data[0].temperatureLow<-1 && json.daily.data[0].temperatureHigh<4 && json.daily.data[0].precipProbability>0.7 && json.daily.data[0].cloudCover>0.7)
        {
            this.setState({photoMessage: "Just stay at home and grab a tea"});
        }
        else if(json.daily.data[0].temperatureLow>18 && json.daily.data[0].temperatureHigh>28)
        {
            this.setState({photoMessage: "Get out, it is going to be warm today"});
        }
        else if(json.daily.data[0].precipType === "snow")
        {
            this.setState({photoMessage: "Perfect day for out in the  snow session"});
        }
        else{
            this.setState({photoMessage: "Not the best day for photos today"});
        }
    }

    checkSummary(json){

            this.setState({now: json.currently.summary});
            this.setState({today: json.hourly.summary});
            this.setState({week: json.daily.summary});
    }
    
    //All the GUI components
    render(){
      const {navigate} = this.props.navigation;
      if (this.state.loadingComplete){
      return (

        <SafeAreaView style={{flex: 1, backgroundColor: 'black' }}>
        <View style={{flex:1, justifyContent: 'center', alignItems: 'center' }}>
            <Image 
                source={this.state.backgroundSource} 
                style={{width: '100%', height: '100%'}}
                />
            <TextInput 
                placeholder= "Enter Location"
                style={styles.textInput} 
                placeholderTextColor="rgba(155,155,155,1)"
                onChangeText = {(text) => this.setState({location: text})}
                onSubmitEditing = {this.handleSubmit}
                value = {this.state.location}
                ref={input => { this.location = input }}
                clearButtonMode='always'
                />

            <Text style={styles.textLow}>Low</Text>
            <Text style={styles.textHigh}>High</Text>
            <Text style={styles.textTemp}>{this.state.temperature}°C</Text>
            <Text style={styles.textLowTemp}>{this.state.lowTemperature}°C</Text>
            <Text style={styles.textHighTemp}>{this.state.highTemperature}°C</Text>
            
            <Image
                source={require("../assets/clouds-512.png")}
                style={styles.cloudImg}
            />
            <Text style={styles.textCloud}>Cloud cover:</Text>
            <Text style={styles.textCloudTemp}>{this.state.cloudCover}%</Text>

            <Image
                source={require("../assets/rain-512.png")}
                style={styles.rainImg}
            />
            <Text style={styles.textRain}>Chance of rain:</Text>
            <Text style={styles.textRainTemp}>{this.state.chanceRain}%</Text>

            <Image
                source={require("../assets/camera.png")}
                style={styles.cameraImg}
            />
            <Text style={styles.textCamera}>{this.state.photoMessage}</Text>

            <Text style={styles.sunrise}>Sunrise:</Text>
            <Text style={styles.sunriseTime}>{this.state.sunriseTime}</Text>
            <Text style={styles.sunset}>Sunset:</Text>
            <Text style={styles.sunsetTime}>{this.state.sunsetTime}</Text>

            <View style = { styles.scrollViewHolder }>
                <ScrollView horizontal = { true } showsHorizontalScrollIndicator = { false }>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[0][0]}:00{"\n"}{this.state.hour[0][1]}°C</Text>
                        <Image source = {this.state.hour[0][2]} style = {styles.icon} ></Image>
                    </View>
                    <View style = { styles.separator }/>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[1][0]}:00{"\n"}{this.state.hour[1][1]}°C</Text>
                        <Image source = {this.state.hour[1][2]} style = {styles.icon} ></Image>
                    </View>
                    <View style = { styles.separator }/>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[2][0]}:00{"\n"}{this.state.hour[2][1]}°C</Text>
                        <Image source = {this.state.hour[2][2]} style = {styles.icon} ></Image>
                    </View>
                    <View style = { styles.separator }/>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[3][0]}:00{"\n"}{this.state.hour[3][1]}°C</Text>
                        <Image source = {this.state.hour[3][2]} style = {styles.icon} ></Image>
                    </View>
                    <View style = { styles.separator }/>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[4][0]}:00{"\n"}{this.state.hour[4][1]}°C</Text>
                        <Image source = {this.state.hour[4][2]} style = {styles.icon} ></Image>
                    </View>
                    <View style = { styles.separator }/>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[5][0]}:00{"\n"}{this.state.hour[5][1]}°C</Text>
                        <Image source = {this.state.hour[5][2]} style = {styles.icon} ></Image>
                    </View>
                    <View style = { styles.separator }/>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[6][0]}:00{"\n"}{this.state.hour[6][1]}°C</Text>
                        <Image source = {this.state.hour[6][2]} style = {styles.icon} ></Image>
                    </View>
                    <View style = { styles.separator }/>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[7][0]}:00{"\n"}{this.state.hour[7][1]}°C</Text>
                        <Image source = {this.state.hour[7][2]} style = {styles.icon} ></Image>
                    </View>
                    <View style = { styles.separator }/>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[8][0]}:00{"\n"}{this.state.hour[8][1]}°C</Text>
                        <Image source = {this.state.hour[8][2]} style = {styles.icon} ></Image>
                    </View>
                    <View style = { styles.separator }/>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[9][0]}:00{"\n"}{this.state.hour[9][1]}°C</Text>
                        <Image source = {this.state.hour[9][2]} style = {styles.icon} ></Image>
                    </View>
                    <View style = { styles.separator }/>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[10][0]}:00{"\n"}{this.state.hour[10][1]}°C</Text>
                        <Image source = {this.state.hour[10][2]} style = {styles.icon} ></Image>
                    </View>
                    <View style = { styles.separator }/>
                    <View style = {styles.scrollRow}>
                        <Text style = { styles.scrollitem }>{this.state.hour[11][0]}:00{"\n"}{this.state.hour[11][1]}°C</Text>
                        <Image source = {this.state.hour[11][2]} style = {styles.icon} ></Image>
                    </View>
                </ScrollView>
            
            </View>
            <Text style={styles.now}>Right now:</Text>
            <Text style={styles.nowText}>{this.state.now}</Text>
            <Text style={styles.today}>Later today:</Text>
            <Text style={styles.todayText}>{this.state.today}</Text>
            <Text style={styles.week}>This week:</Text>
            <Text style={styles.weekText}>{this.state.week}</Text>

            <Text style={styles.darkSkyUrl} //the acknowledgment for the API
                onPress={() => Linking.openURL('https://darksky.net/poweredby/')}>
            Powered by Dark Sky
            </Text>

        </View>
      </SafeAreaView>
      );
    }
    else { //Loading screen, until all data has been gathered
        return(
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
            <ActivityIndicator size="large" color="#0000ff" />
        </View>
        );
    }
}
  }
const styles = StyleSheet.create({  //All the stylesheets used to 
    //position all the elements and style them
    
    darkSkyUrl: { // Acknowledgment for the Dark Sky API
        color: "rgba(255,255,255,1)",
        bottom: 10,
        right: 0,
        position: "absolute",
        paddingRight: 10,
        backgroundColor: "transparent",
        fontSize: 12, 
        fontFamily: "AvenirNext-BoldItalic"
    },

    icon: {
        width: "30%",
        height: "30%",
        paddingTop: 10,
        paddingBottom: 10
    },

    scrollRow: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },

    textLow: {
        top: 80,
        position: "absolute",
        paddingLeft: 10,
        backgroundColor: "transparent",
        fontSize: 30,
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        left: 0
    },
    textHigh: {
        top: 80,
        position: "absolute",
        paddingRight: 10,
        backgroundColor: "transparent",
        fontSize: 30,
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        right: 0
    },
    textTemp: {
        top: 80,
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 60,
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",

    },
    textLowTemp: {
        top: 120,
        position: "absolute",
        paddingLeft: 10,
        backgroundColor: "transparent",
        fontSize: 30,
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        left: 0
    },

    textHighTemp: {
        top: 120,
        position: "absolute",
        paddingRight: 10,
        backgroundColor: "transparent",
        fontSize: 30,
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        right: 0
    },

    textInput: {
        height: 51,
        width: '100%',
        top: 20,
        position: "absolute",
        fontFamily: "AvenirNext-BoldItalic",
        fontSize: 40,
        color: "rgba(255,255,255,1)",
        textAlign: "center",
        justifyContent: "center"
    },
    cloudImg: {
        height: 30,
        width: 30,
        top: 200,
        left: 0,
        marginLeft: 10,
        position: "absolute"
    },

    textCloud: {
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 20,
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        top: 200
    },
    textCloudTemp: {
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 20,
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingRight: 10,
        right: 0,
        top: 200
    },

    rainImg: {
        height: 30,
        width: 30,
        left: 0,
        marginLeft: 10,
        position: "absolute",
        top: 240
    },

    textRain: {
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 20,
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        top: 240
    },

    textRainTemp: {
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 20,
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingRight: 10,
        right: 0,
        top: 240
    },
    cameraImg: {
        height: 30,
        width: 30,
        left: 0,
        marginLeft: 10,
        position: "absolute",
        top: 280
    },

    textCamera: {
        position: "absolute",
        backgroundColor: "transparent",
        width: '80%',
        fontSize: 20,
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingRight: 10,
        right: 0,
        top: 280
        
    },

    sunrise: {
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 20, 
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingLeft: 10,
        left: 0,
        top: 340
    },

    sunriseTime: {
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 20, 
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingLeft: 10,
        left: 0,
        top: 365
    },

    sunset: {
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 20, 
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingRight: 10,
        right: 0,
        top: 340
    },

    sunsetTime: {
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 20, 
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingRight: 10,
        right: 0,
        top: 365
    },

    scrollViewHolder: {
        flex: 1,
        position: "absolute",
        borderTopWidth: 2,
        backgroundColor: 'rgba(45, 38, 90, 0.3)',
        borderBottomWidth: 2,
        borderTopColor: 'rgba(45, 38, 90,0.5)',
        borderBottomColor: 'rgba(45, 38, 90,0.5)',
        paddingTop: 5,
        paddingBottom: 5,
        top: 450,
   },

   scrollitem: {
        paddingLeft: 15,
        paddingRight: 15,
        color: 'white',
        fontSize: 18
   },

   separator: {
        backgroundColor: 'rgba(0,0,0,0.5)'
   },

   now: {
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 16, 
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingLeft: 10,
        left: 0,
        top: 530

    },
    nowText: {
        position: "absolute",
        backgroundColor: "transparent",
        width: '70%',
        fontSize: 14, 
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingRight: 10,
        right: 0,
        top: 530
    },

    today: {
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 16, 
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingLeft: 10,
        left: 0,
        top: 570

    },
    todayText: {
        position: "absolute",
        backgroundColor: "transparent",
        width: '70%',
        fontSize: 14, 
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingRight: 10,
        right: 0,
        top: 570
    },
    week: {
        position: "absolute",
        backgroundColor: "transparent",
        fontSize: 16, 
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingLeft: 10,
        left: 0,
        top: 630

    },
    weekText: {
        position: "absolute",
        backgroundColor: "transparent",
        width: '70%',
        fontSize: 14, 
        fontFamily: "AvenirNext-BoldItalic",
        color: "rgba(255,255,255,1)",
        paddingRight: 10,
        right: 0,
        top: 630
    },
    
});