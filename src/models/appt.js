const connection  = require('../database.js');
const helpers = require('../lib/helpers');
const historyAPI = require('../models/clinic_history.js');

class Appt {
    constructor ( id, appt_date, desc, status, start_t, end_t, register_date, pet_photo, pet_id, vet_id, veterinary_id,type ){
        this.id = id;
        this.appt_date = appt_date
        this.desc = desc
        this.status = status
        this.start_t = start_t
        this.end_t = end_t
        this.register_date = register_date
        this.pet_photo = pet_photo
        this.pet_id = pet_id
        this.vet_id = vet_id
        this.veterinary_id = veterinary_id 
        this.type = type
    }
    
    finishAppointment(historyData,handler){
        connection.query('UPDATE Appointment SET status = ? WHERE appointment_id = ?',['TERMINADO',historyData.appointment_id],(err,result)=>{
          if(err){
            console.log(err);
            handler(err);
          }else{
            historyAPI.addHistory(historyData,(error)=>{
              if(error){
                console.log(error);
                handler(error)
              }else{
                handler(null);
              }
            });
            
          }
        });
    }
    
    getAppts(userId,handler){
      let response = [];
      connection.query('call prcd_appointments(?)',[userId],async (err,rows)=>{
        if(!err){
          if(rows[0].length>0){
            await helpers.ForEach(rows[0],async (appt)=>{
              await historyAPI.getHistory(appt.pet_id,(hist,err)=>{
                if(err){
                  console.log(err);
                  handler(null,err);
                }else{
                  response.push({
                    appointment:new Appt(
                      appt.appointment_id,
                      appt.appointment_date,
                      appt.description,
                      appt.status,
                      appt.start_time,
                      appt.end_time,
                      appt.register_date,
                      appt.pet_photo,
                      appt.pet_id,
                      appt.veterinarian_id,
                      appt.veterinary_id,
                      appt.type
                    ),
                    pet:{
                      name : appt.name,
                      description : appt.pet_desc,
                      race : appt.race,
                      birth_date : appt.birth_date,
                      status : appt.pet_status,
                      image_url : appt.image_url,
                      owner_id : appt.owner_id,
                      history: hist
                    },
                    veterinarian: {
                      name: appt.vet_name
                    },
                    veterinary:{
                      logo: appt.photo,
                      name: appt.veterinary_name,
                      phone: appt.phone,
                      location: appt.location,
                      latitude: appt.latitude,
                      longitude: appt.longitude
                    }
                  });
                }
              });
            });
          }
          handler(response,null);
        }else{
          console.log(err);
          handler(null,err);
        }
      });
    }

    getApptsDataByUserId(userId,userableType, handler) { 
      var response = []
      var query = 'SELECT Appointment.*,' 
      query += 'Pet.name, Pet.description as pet_desc, Pet.race, Pet.birth_date, Pet.status as pet_status, Pet.image_url, Pet.owner_id,'
      query += 'Person.name as vet_name,'
      query += 'Veterinary.name as veterinary_name,Veterinary.phone, Veterinary.location, Veterinary.latitude, Veterinary.longitude, '
      query += 'User.photo '
      query += 'FROM Appointment '
      query += 'JOIN Pet ON Appointment.pet_id = Pet.pet_id '
      query += 'JOIN Person ON Appointment.veterinarian_id = Person.person_id '
      query += 'JOIN Veterinary ON Appointment.veterinary_id = Veterinary.veterinary_id '
      query += 'JOIN User ON Veterinary.veterinary_id = User.user_id '
      if (userableType == 0){
        query += 'WHERE veterinary_id = ' + userId
      } else if (userableType == 1){
        query += 'WHERE veterinarian_id = ' + userId
      } else if (userableType == 2){
        query += 'WHERE owner_id = ' + userId
      }
      connection.query(query, [userId],(err, rows) => {
        if(!err) {
          rows.forEach(appt => {
            response.push({
              appointment:new Appt(
                appt.appointment_id,
                appt.appointment_date,
                appt.description,
                appt.status,
                appt.start_time,
                appt.end_time,
                appt.register_date,
                appt.pet_photo,
                appt.pet_id,
                appt.veterinarian_id,
                appt.veterinary_id,
                appt.type
              ),
              pet:{
                name : appt.name,
                description : appt.pet_desc,
                race : appt.race,
                birth_date : appt.birth_date,
                status : appt.pet_status,
                image_url : appt.image_url,
                owner_id : appt.owner_id,
              },
              veterinarian: {
                name: appt.vet_name
              },
              veterinary:{
                logo: appt.photo,
                name: appt.veterinary_name,
                phone: appt.phone,
                location: appt.location,
                latitude: appt.latitude,
                longitude: appt.longitude
              }
            })
          })
          handler(response,null)
        } else {
          console.log(err);
          handler(null,err)
        }
      }); 
    }

    addAppts(appt_data,handler){
      query = 'SELECT * FROM Appointment ';
      query += 'WHERE ((? between start_time and end_time) OR (? between start_time and end_time)) ';
      query += 'AND veterinarian_id = ?)';
      connection.query(query,[appt_data.start_time,appt_data.end_time,appt_data.veterinarian_id],(err,rows)=>{
        if(err){
          console.log(err);
          handler(err);
        }else{
          if(rows.length===0){
            connection.query('INSERT INTO Appointment SET ? ',[appt_data],(err,result)=>{
              if(err){
                console.log(err);
                handler(err);
              }else{ 
                handler(null);
              }
            });
          }else{
            handler({message:"Appointments full"});
          }
        }
      });
      
    }
}
  
module.exports = new Appt()